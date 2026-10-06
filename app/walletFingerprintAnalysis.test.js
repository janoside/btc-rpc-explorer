"use strict";

const assert = require("assert");
const { analyzeTransaction, gatherLinkedSignatures } = require("./walletFingerprintAnalysis.js");

const lowRSig = "3044" + "0220" + "aa".repeat(32) + "0220" + "aa".repeat(32) + "01";
const highRSig = "3045" + "0221" + "bb".repeat(33) + "0220" + "bb".repeat(32) + "01";
const compressedPk = "02" + "cc".repeat(32);
const uncompressedPk = "04" + "dd".repeat(64);

function p2wpkhInput(txid, vout, sequence, sig, pk) {
	return { txid, vout, sequence, txinwitness: [sig, pk], scriptSig: { asm: "" } };
}

function prevout(type, address, valueBtc) {
	return { scriptPubKey: { type, address }, value: valueBtc };
}

function out(type, address, valueBtc, hex) {
	return { scriptPubKey: { type, address, hex }, value: valueBtc };
}

let pass = 0;
process.on("exit", () => console.log(`\n${pass} checks passed`));
function check(name, cond) {
	assert.ok(cond, name);
	pass++;
	console.log("ok -", name);
}

{
	const tx = {
		version: 2,
		locktime: 839990,
		vin: [p2wpkhInput("aa".repeat(32), 0, 0xfffffffd, lowRSig, compressedPk)],
		vout: [
			out("witness_v0_keyhash", "bc1qchg", 0.00412345, "0014" + "11".repeat(20)),
			out("witness_v0_keyhash", "bc1qpay", 0.005, "0014" + "99".repeat(20))
		]
	};
	const txInputs = { 0: prevout("witness_v0_keyhash", "bc1qin", 0.01) };
	const r = analyzeTransaction(tx, txInputs, 840000, 840000);

	check("electrum: available", r.available === true);
	check("electrum: Core and Electrum among candidates", r.walletCandidates.includes("Bitcoin Core") && r.walletCandidates.includes("Electrum"));
	check("electrum: has signals", r.signals.length > 5);
	check("electrum: anti-fee-sniping signal present", r.signals.some((s) => s.label === "Anti-fee-sniping" && /840|tip/i.test(s.value + s.implication)));
	check("electrum: low-R signal is probabilistic, not a grinding claim", r.signals.some((s) => s.label === "Low-R grinding" && /weak evidence|half the time/.test(s.implication) && !/grinds nonces/.test(s.implication)));
}

{
	const tx = {
		version: 2,
		locktime: 0,
		vin: [p2wpkhInput("ab".repeat(32), 1, 0xffffffff, highRSig, compressedPk)],
		vout: [
			out("witness_v0_keyhash", "bc1qpay", 0.02, "0014" + "22".repeat(20)),
			out("witness_v0_keyhash", "bc1qchg", 0.00499999, "0014" + "33".repeat(20))
		]
	};
	const txInputs = { 0: prevout("witness_v0_keyhash", "bc1qin2", 0.0251) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("coinbase-wallet: Coinbase among candidates", r.walletCandidates.includes("Coinbase Wallet"));
	check("coinbase-wallet: no-RBF signal", r.signals.some((s) => s.label === "RBF signaling" && /No/.test(s.value)));
	check("coinbase-wallet: high-R reliably rules out grinders", r.signals.some((s) => s.label === "Low-R grinding" && /^No \(/.test(s.value) && /33-byte/.test(s.value)));
	check("p2wpkh no-RBF: Blue Wallet discarded (a native segwit Blue Wallet would have signaled RBF)", !r.walletCandidates.includes("Blue Wallet"));
}

{
	const tx = {
		version: 2,
		locktime: 0,
		vin: [p2wpkhInput("ac".repeat(32), 0, 0xffffffff, lowRSig, uncompressedPk)],
		vout: [out("witness_v0_keyhash", "bc1qx", 0.01, "0014" + "44".repeat(20))]
	};
	const txInputs = { 0: prevout("witness_v0_keyhash", "bc1qin3", 0.02) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("uncompressed: no candidates", r.walletCandidates.length === 0);
	check("uncompressed: flagged in signals", r.signals.some((s) => s.label === "Public keys" && /Uncompressed/.test(s.value)));
}

{
	const tx = { version: 1, locktime: 0, vin: [{ coinbase: "deadbeef" }], vout: [out("witness_v0_keyhash", "bc1q", 6.25, "0014" + "55".repeat(20))] };
	const r = analyzeTransaction(tx, {}, 840000, 840000);
	check("coinbase tx: not available", r.available === false);
}

{
	const tx = {
		version: 2,
		locktime: 0,
		vin: [{ txid: "ad".repeat(32), vout: 0, sequence: 0xfffffffd, txinwitness: [], scriptSig: { asm: "" } }],
		vout: [out("witness_v0_keyhash", "bc1qy", 0.01, "0014" + "66".repeat(20))]
	};
	const r = analyzeTransaction(tx, null, 0, 840000);
	check("no-prevout: available", r.available === true);
	check("no-prevout: haveInputData false", r.haveInputData === false);
	check("no-prevout: no reuse signal (needs previous outputs)", !r.signals.some((s) => s.label === "Address reuse"));
	check("no-prevout: no low-R signal when the input carries no signature", !r.signals.some((s) => s.label === "Low-R grinding"));
}

{
	// a pruned node supplies no previous outputs, but the signatures are in the raw tx
	const tx = {
		version: 2,
		locktime: 0,
		vin: Array.from({ length: 6 }, (_, i) => ({
			txid: "c8".repeat(32), vout: i, sequence: 0xfffffffd,
			scriptSig: { asm: lowRSig + " " + compressedPk }, txinwitness: []
		})),
		vout: [out("pubkeyhash", "1Q41", 0.04, "76a914" + "11".repeat(20) + "88ac")]
	};
	const r = analyzeTransaction(tx, null, 840001, 840002);

	check("pruned: low-R is analyzed without previous outputs", r.signals.some((s) => s.label === "Low-R grinding" && /all 6/.test(s.value)));
	check("pruned: strong low-R still eliminates the non-grinding devices", !r.signerCandidates.includes("Trezor device") && !r.signerCandidates.includes("Ledger device"));
	check("pruned: grinding-based survival is graded possible, not likely", r.signerVerdict === "Coldcard possible");
	check("pruned: input-type dependent checks stay skipped", r.haveInputData === false && !r.signals.some((s) => s.label === "Input script types"));
}

{
	// taproot key-path spend recognized from the witness alone, with no previous outputs
	const tx = {
		version: 2,
		locktime: 0,
		vin: [{ txid: "c9".repeat(32), vout: 0, sequence: 0xfffffffd, txinwitness: ["ab".repeat(64)], scriptSig: { asm: "" } }],
		vout: [out("witness_v1_taproot", "bc1ptr", 0.01, "5120" + "77".repeat(32))]
	};
	const r = analyzeTransaction(tx, null, 840001, 840002);

	check("pruned: a taproot witness rules out Coldcard without previous outputs", !r.signerCandidates.includes("Coldcard"));
	check("pruned: the taproot-capable devices survive", r.signerVerdict === "Trezor device, Ledger device possible");
}

{
	const tx = {
		version: 2,
		locktime: 0,
		vin: [{ txid: "ae".repeat(32), vout: 0, sequence: 0xfffffffd, txinwitness: ["ab".repeat(64)], scriptSig: { asm: "" } }],
		vout: [out("witness_v1_taproot", "bc1ptr", 0.01, "5120" + "77".repeat(32))]
	};
	const txInputs = { 0: prevout("witness_v1_taproot", "bc1pin", 0.02) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("taproot-only: available", r.available === true);
	check("taproot-only: no low-R signal (no ECDSA sigs examined)", !r.signals.some((s) => s.label === "Low-R grinding"));
}

{
	const tx = {
		version: 2,
		locktime: 0,
		vin: [{ txid: "ba".repeat(32), vout: 0, sequence: 0xffffffff, scriptSig: { asm: lowRSig + " " + compressedPk }, txinwitness: [] }],
		vout: [
			out("pubkeyhash", "1pay", 0.02, "76a914" + "22".repeat(20) + "88ac"),
			out("pubkeyhash", "1chg", 0.00499999, "76a914" + "33".repeat(20) + "88ac")
		]
	};
	const txInputs = { 0: prevout("pubkeyhash", "1in", 0.0251) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("bluewallet legacy p2pkh no-RBF: Blue Wallet still a candidate", r.walletCandidates.includes("Blue Wallet"));
	check("bluewallet legacy p2pkh no-RBF: RBF text mentions Blue Wallet", r.signals.some((s) => s.label === "RBF signaling" && /Blue Wallet/.test(s.implication)));
}

{
	const tx = {
		version: 2,
		locktime: 0,
		vin: [{ txid: "bb".repeat(32), vout: 0, sequence: 0xffffffff, scriptSig: { asm: "" }, txinwitness: [lowRSig, compressedPk] }],
		vout: [out("scripthash", "3pay", 0.01, "a914" + "44".repeat(20) + "87")]
	};
	const txInputs = { 0: prevout("scripthash", "3in", 0.02) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("bluewallet bip49 p2sh no-RBF: Blue Wallet still a candidate", r.walletCandidates.includes("Blue Wallet"));
}

{
	const tx = {
		version: 2,
		locktime: 839995,
		vin: [p2wpkhInput("ca".repeat(32), 0, 0xfffffffd, lowRSig, compressedPk)],
		vout: [
			out("witness_v0_keyhash", "bc1qpay", 0.005, "0014" + "11".repeat(20)),
			out("witness_v0_keyhash", "bc1qchg", 0.00412345, "0014" + "99".repeat(20))
		]
	};
	const txInputs = { 0: prevout("witness_v0_keyhash", "bc1qin", 0.01) };
	const r = analyzeTransaction(tx, txInputs, 840000, 840000);

	check("sparrow: anti-fee-sniping tx keeps Sparrow a candidate", r.walletCandidates.includes("Sparrow"));
}

{
	const tx = {
		version: 2,
		locktime: 0,
		vin: [p2wpkhInput("cb".repeat(32), 0, 0xfffffffd, lowRSig, compressedPk)],
		vout: [
			out("witness_v0_keyhash", "bc1qchg", 0.00412345, "0014" + "99".repeat(20)),
			out("witness_v0_keyhash", "bc1qpay", 0.005, "0014" + "11".repeat(20))
		]
	};
	const txInputs = { 0: prevout("witness_v0_keyhash", "bc1qin", 0.01) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("nunchuk: non-last change keeps Nunchuk (random change position)", r.walletCandidates.includes("Nunchuk"));
	check("nunchuk: non-last change drops the change-last wallets (Sparrow)", !r.walletCandidates.includes("Sparrow"));
}

{
	const tx = {
		version: 2,
		locktime: 839995,
		vin: [p2wpkhInput("da".repeat(32), 0, 0xfffffffd, lowRSig, compressedPk)],
		vout: [
			out("witness_v0_keyhash", "bc1qpay", 0.005, "0014" + "11".repeat(20)),
			out("witness_v0_keyhash", "bc1qchg", 0.00412345, "0014" + "99".repeat(20))
		]
	};
	const txInputs = { 0: prevout("witness_v0_keyhash", "bc1qin", 0.01) };
	const extra = { low: 6, high: 0, linkedTxids: ["a", "b", "c", "d", "e", "f"] };
	const r = analyzeTransaction(tx, txInputs, 840000, 840000, extra);

	check("compound strong-low: low-R signal becomes strong evidence", r.signals.some((s) => s.label === "Low-R grinding" && /strong evidence/.test(s.implication) && /linked transaction/.test(s.value)));
	check("compound strong-low: a non-grinder (Nunchuk) is ruled out", !r.walletCandidates.includes("Nunchuk"));
	check("compound strong-low: a grinder (Sparrow) survives", r.walletCandidates.includes("Sparrow"));
}

{
	const tx = {
		version: 2,
		locktime: 0,
		vin: [p2wpkhInput("db".repeat(32), 0, 0xfffffffd, lowRSig, compressedPk)],
		vout: [out("witness_v0_keyhash", "bc1qx", 0.01, "0014" + "11".repeat(20))]
	};
	const txInputs = { 0: prevout("witness_v0_keyhash", "bc1qin", 0.02) };
	const extra = { low: 3, high: 1, linkedTxids: ["a", "b", "c", "d"] };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002, extra);

	check("compound high-R from linked tx rules out grinders", r.signals.some((s) => s.label === "Low-R grinding" && /^No \(/.test(s.value)) && !r.walletCandidates.includes("Sparrow"));
}

{
	const tx = {
		version: 2,
		locktime: 839990,
		vin: [p2wpkhInput("fa".repeat(32), 0, 0xfffffffd, lowRSig, compressedPk)],
		vout: [
			out("witness_v0_keyhash", "bc1qchg", 0.00412345, "0014" + "11".repeat(20)),
			out("witness_v0_keyhash", "bc1qpay", 0.005, "0014" + "99".repeat(20))
		]
	};
	const txInputs = { 0: prevout("witness_v0_keyhash", "bc1qin", 0.01) };
	const r = analyzeTransaction(tx, txInputs, 840000, 840000);

	check("references: RBF signal links to BIP-125", r.signals.some((s) => s.label === "RBF signaling" && s.reference === "https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki"));
	check("references: Low-R signal links to Optech topic", r.signals.some((s) => s.label === "Low-R grinding" && s.reference === "https://bitcoinops.org/en/topics/low-r-grinding/"));
	check("references: every signal has a reference url", r.signals.every((s) => typeof s.reference === "string" && s.reference.startsWith("https://")));
}

{
	const tx = {
		version: 2,
		locktime: 0,
		vin: [p2wpkhInput("ab".repeat(32), 0, 0x80000000, lowRSig, compressedPk)],
		vout: [out("witness_v0_keyhash", "bc1qx", 0.01, "0014" + "11".repeat(20))]
	};
	const txInputs = { 0: prevout("witness_v0_keyhash", "bc1qin", 0.02) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("nsequence 0x80000000: Blue Wallet kept", r.walletCandidates.includes("Blue Wallet"));
	check("nsequence 0x80000000: an fd-family wallet (Cake) is ruled out", !r.walletCandidates.includes("Cake Wallet"));
	check("nsequence signal shows the exact value", r.signals.some((s) => s.label === "nSequence value" && /0x80000000/.test(s.value)));
}

{
	const tx = {
		version: 2,
		locktime: 0,
		vin: [p2wpkhInput("ac".repeat(32), 0, 0xfffffffd, lowRSig, compressedPk)],
		vout: [out("witness_v0_keyhash", "bc1qx", 0.01, "0014" + "11".repeat(20))]
	};
	const txInputs = { 0: prevout("witness_v0_keyhash", "bc1qin", 0.02) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("nsequence 0xfffffffd native-segwit: Blue Wallet ruled out (it uses 0x80000000)", !r.walletCandidates.includes("Blue Wallet"));
}

{
	const tx = {
		version: 2,
		locktime: 0,
		vin: [
			p2wpkhInput("ea".repeat(32), 0, 0xfffffffd, lowRSig, compressedPk),
			p2wpkhInput("eb".repeat(32), 0, 0xfffffffd, lowRSig, compressedPk)
		],
		vout: [
			out("witness_v0_keyhash", "bc1qchg", 0.0009, "0014" + "11".repeat(20)),
			out("witness_v0_keyhash", "bc1qpay", 0.006, "0014" + "99".repeat(20))
		]
	};
	const txInputs = { 0: prevout("witness_v0_keyhash", "bc1qin1", 0.003), 1: prevout("witness_v0_keyhash", "bc1qin2", 0.004) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("UIH: detects change smaller than the smallest input even when both amounts are round", r.signals.some((s) => s.label === "Detected change output" && /index 0/.test(s.value) && /not last/.test(s.value)));
}

{
	const tx = {
		version: 2,
		locktime: 0,
		vin: [{ txid: "fb".repeat(32), vout: 0, sequence: 0xfffffffd, scriptSig: { asm: "" }, txinwitness: [lowRSig, compressedPk] }],
		vout: [out("scripthash", "3pay", 0.01, "a914" + "44".repeat(20) + "87")]
	};
	const txInputs = { 0: prevout("scripthash", "3in", 0.02) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("nested-segwit (P2SH-P2WPKH): low-R signal is now produced", r.signals.some((s) => s.label === "Low-R grinding"));
	check("nested-segwit (P2SH-P2WPKH): compressed key recognized", r.signals.some((s) => s.label === "Public keys" && /Compressed/.test(s.value)));
}

{
	const tx = {
		version: 2,
		locktime: 0,
		vin: [{ txid: "fc".repeat(32), vout: 0, sequence: 0xffffffff, scriptSig: { asm: "" }, txinwitness: [lowRSig, uncompressedPk] }],
		vout: [out("scripthash", "3x", 0.01, "a914" + "44".repeat(20) + "87")]
	};
	const txInputs = { 0: prevout("scripthash", "3in", 0.02) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("nested-segwit uncompressed key: flagged and no candidates", r.signals.some((s) => s.label === "Public keys" && /Uncompressed/.test(s.value)) && r.walletCandidates.length === 0);
}

{
	const p2pkSig = lowRSig;
	const tx = {
		version: 2,
		locktime: 0,
		vin: [{ txid: "fd".repeat(32), vout: 0, sequence: 0xffffffff, scriptSig: { asm: p2pkSig }, txinwitness: [] }],
		vout: [out("pubkeyhash", "1x", 0.01, "76a914" + "44".repeat(20) + "88ac")]
	};
	const txInputs = { 0: prevout("pubkey", "1in", 0.02) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("P2PK input: low-R signal is produced from the bare signature", r.signals.some((s) => s.label === "Low-R grinding"));
}

{
	const acpSig = "3044" + "0220" + "aa".repeat(32) + "0220" + "aa".repeat(32) + "83";
	const tx = {
		version: 2,
		locktime: 0,
		vin: [p2wpkhInput("fe".repeat(32), 0, 0xffffffff, acpSig, compressedPk)],
		vout: [out("witness_v0_keyhash", "bc1qx", 0.01, "0014" + "11".repeat(20))]
	};
	const txInputs = { 0: prevout("witness_v0_keyhash", "bc1qin", 0.02) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("sighash: a non-ALL flag surfaces a Signature hash type signal", r.signals.some((s) => s.label === "Signature hash type" && /ANYONECANPAY/.test(s.value)));
	check("sighash: signal carries a reference url", r.signals.some((s) => s.label === "Signature hash type" && typeof s.reference === "string" && s.reference.startsWith("https://")));
}

{
	const tx = {
		version: 2,
		locktime: 0,
		vin: [{ txid: "ef".repeat(32), vout: 0, sequence: 0xffffffff, scriptSig: { asm: "" }, txinwitness: ["ab".repeat(64) + "83"] }],
		vout: [out("witness_v1_taproot", "bc1ptr", 0.01, "5120" + "77".repeat(32))]
	};
	const txInputs = { 0: prevout("witness_v1_taproot", "bc1pin", 0.02) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("sighash: taproot 65-byte witness with explicit SIGHASH_SINGLE|ANYONECANPAY is surfaced", r.signals.some((s) => s.label === "Signature hash type" && /SINGLE\|ANYONECANPAY/.test(s.value)));
}

{
	const tx = {
		version: 2,
		locktime: 0,
		vin: [p2wpkhInput("df".repeat(32), 0, 0xffffffff, lowRSig, compressedPk)],
		vout: [out("witness_v0_keyhash", "bc1qx", 0.01, "0014" + "11".repeat(20))]
	};
	const txInputs = { 0: prevout("witness_v0_keyhash", "bc1qin", 0.02) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("sighash: a plain SIGHASH_ALL transaction adds no sighash signal", !r.signals.some((s) => s.label === "Signature hash type"));
}

{
	const tx = {
		version: 2,
		locktime: 0,
		vin: [p2wpkhInput("c1".repeat(32), 0, 0xfffffffd, lowRSig, compressedPk)],
		vout: [
			out("witness_v0_keyhash", "bc1qpay", 0.01, "0014" + "11".repeat(20)),
			out("witness_v0_keyhash", "bc1qchg", 0.00987654, "0014" + "22".repeat(20))
		]
	};
	const txInputs = { 0: prevout("witness_v0_keyhash", "bc1qin", 0.02) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("signer: an ordinary low-R spend eliminates nobody", r.signerCandidates.length === 3);
	check("signer: nothing eliminated means no verdict is reported", r.signerVerdict === null);
	check("signer: nothing eliminated means no signing device row", !r.signals.some((s) => s.label === "Signing device"));
}

{
	// six low-R signatures is the threshold at which grinding is treated as deliberate
	const tx = {
		version: 2,
		locktime: 0,
		vin: Array.from({ length: 6 }, (_, i) => p2wpkhInput("c7".repeat(32), i, 0xfffffffd, lowRSig, compressedPk)),
		vout: [out("witness_v0_keyhash", "bc1qx", 0.0599, "0014" + "11".repeat(20))]
	};
	const txInputs = {};
	for (let i = 0; i < 6; i++) {
		txInputs[i] = prevout("witness_v0_keyhash", "bc1qin" + i, 0.01);
	}
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("signer: deliberate low-R grinding eliminates the non-grinding devices", !r.signerCandidates.includes("Trezor device") && !r.signerCandidates.includes("Ledger device"));
	check("signer: the grinding device survives", r.signerCandidates.includes("Coldcard"));
	check("signer: verdict names the survivor with a strength grade", r.signerVerdict === "Coldcard possible");
	check("signer: signing device row names the reason for each elimination", r.signals.some((s) => s.label === "Signing device" && /Trezor device: deliberate low-R grinding, which it never does/.test(s.implication)));
	check("signer: signer verdict is separate from the wallet verdict", r.verdict !== r.signerVerdict);
}

{
	const tx = {
		version: 2,
		locktime: 0,
		vin: [p2wpkhInput("c2".repeat(32), 0, 0xfffffffd, highRSig, compressedPk)],
		vout: [out("witness_v0_keyhash", "bc1qx", 0.0199, "0014" + "11".repeat(20))]
	};
	const txInputs = { 0: prevout("witness_v0_keyhash", "bc1qin", 0.02) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("signer: high-R rules out Coldcard", !r.signerCandidates.includes("Coldcard"));
	check("signer: the non-grinding devices survive a high-R signature", r.signerVerdict === "Trezor device, Ledger device possible");
	check("signer: high-R implication names the grinding signers", r.signals.some((s) => s.label === "Low-R grinding" && /Coldcard/.test(s.implication)));
}

{
	const tx = {
		version: 2,
		locktime: 0,
		vin: [p2wpkhInput("c3".repeat(32), 0, 0xfffffffd, highRSig, compressedPk)],
		vout: [out("witness_v0_keyhash", "bc1qx", 0.0199, "0014" + "11".repeat(20))]
	};
	const txInputs = { 0: prevout("witness_v0_keyhash", "bc1qin", 0.02) };
	const r = analyzeTransaction(tx, txInputs, 600000, 840002);

	check("signer: high-R before firmware 4.1.2 does not rule out Coldcard", r.signerCandidates.includes("Coldcard"));
	check("signer: nothing eliminated at that height, so no verdict", r.signerVerdict === null);
}

{
	const tx = {
		version: 2,
		locktime: 0,
		vin: [{ txid: "c4".repeat(32), vout: 0, sequence: 0xfffffffd, txinwitness: ["ab".repeat(64)], scriptSig: { asm: "" } }],
		vout: [out("witness_v1_taproot", "bc1ptr", 0.01, "5120" + "77".repeat(32))]
	};
	const txInputs = { 0: prevout("witness_v1_taproot", "bc1pin", 0.02) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("signer: a taproot spend rules out Coldcard mainline firmware", !r.signerCandidates.includes("Coldcard"));
	check("signer: Trezor and Ledger sign taproot, so they survive", r.signerVerdict === "Trezor device, Ledger device possible");
}

{
	const tx = {
		version: 2,
		locktime: 0,
		vin: [p2wpkhInput("c5".repeat(32), 0, 0xfffffffd, lowRSig.slice(0, -2) + "02", compressedPk)],
		vout: [out("witness_v0_keyhash", "bc1qx", 0.0199, "0014" + "11".repeat(20))]
	};
	const txInputs = { 0: prevout("witness_v0_keyhash", "bc1qin", 0.02) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("signer: SIGHASH_NONE rules out every profiled device", r.signerCandidates.length === 0);
	check("signer: all-eliminated verdict", r.signerVerdict === "Coldcard, Trezor device, Ledger device ruled out");
}

{
	const tx = {
		version: 2,
		locktime: 0,
		vin: [p2wpkhInput("c6".repeat(32), 0, 0xfffffffd, lowRSig, uncompressedPk)],
		vout: [out("witness_v0_keyhash", "bc1qx", 0.0199, "0014" + "11".repeat(20))]
	};
	const txInputs = { 0: prevout("witness_v0_keyhash", "bc1qin", 0.02) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("signer: an uncompressed key outside a P2PK input rules out every profiled device", r.signerCandidates.length === 0);
}

(async () => {
	const pk = compressedPk;
	const chainOut = [
		out("witness_v0_keyhash", "bc1qpay", 0.005, "0014" + "11".repeat(20)),
		out("witness_v0_keyhash", "bc1qchg", 0.00412345, "0014" + "99".repeat(20))
	];
	const parentTxid = "ee".repeat(32);
	const gpTxid = "ff".repeat(32);
	const unknownTxid = "12".repeat(32);

	const parentTx = { txid: parentTxid, vin: [{ txid: gpTxid, vout: 1, txinwitness: [lowRSig, pk], scriptSig: { asm: "" } }], vout: chainOut };
	const gpTx = { txid: gpTxid, vin: [{ txid: unknownTxid, vout: 1, txinwitness: [lowRSig, pk], scriptSig: { asm: "" } }], vout: chainOut };
	const chainInputs = { 0: prevout("witness_v0_keyhash", "bc1qin", 0.02) };

	const fetcher = async (txid) => {
		if (txid === parentTxid) return { tx: parentTx, txInputs: chainInputs };
		if (txid === gpTxid) return { tx: gpTx, txInputs: chainInputs };
		return null;
	};

	const startTx = { txid: "aa".repeat(32), vin: [{ txid: parentTxid, vout: 1, txinwitness: [lowRSig, pk], scriptSig: { asm: "" } }], vout: chainOut };
	const startInputs = { 0: prevout("witness_v0_keyhash", "bc1qin", 0.02) };

	const r = await gatherLinkedSignatures(startTx, startInputs, fetcher, 4);
	check("graph walk: follows the 2-hop self-change chain", r.linkedTxids.length === 2);
	check("graph walk: collects low-R sigs from linked txs", r.low === 2 && r.high === 0);

	const none = await gatherLinkedSignatures(startTx, startInputs, null, 4);
	check("graph walk: no fetcher returns empty", none.linkedTxids.length === 0);

})();

{
	// Runes-style OP_RETURN: OP_RETURN OP_13 <18-byte push>, two pushes, so not Trezor
	const tx = {
		version: 2,
		locktime: 0,
		vin: [p2wpkhInput("d1".repeat(32), 0, 0xfffffffd, lowRSig, compressedPk)],
		vout: [
			out("nulldata", null, 0, "6a5d1214011400ff7f818cec82d08bc0a88281d215"),
			out("witness_v0_keyhash", "bc1qx", 0.0099, "0014" + "11".repeat(20))
		]
	};
	const txInputs = { 0: prevout("witness_v0_keyhash", "bc1qin", 0.01) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("op_return: a two-push OP_RETURN rules out Trezor", !r.signerCandidates.includes("Trezor device"));
	check("op_return: Coldcard and Ledger accept it", r.signerCandidates.includes("Coldcard") && r.signerCandidates.includes("Ledger device"));
}

{
	// OP_RETURN over the 83-byte script limit Ledger enforces
	const tx = {
		version: 2,
		locktime: 0,
		vin: [p2wpkhInput("d2".repeat(32), 0, 0xfffffffd, lowRSig, compressedPk)],
		vout: [
			out("nulldata", null, 0, "6a4c96" + "ab".repeat(150)),
			out("witness_v0_keyhash", "bc1qx", 0.0099, "0014" + "11".repeat(20))
		]
	};
	const txInputs = { 0: prevout("witness_v0_keyhash", "bc1qin", 0.01) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("op_return: an oversized OP_RETURN rules out Ledger", !r.signerCandidates.includes("Ledger device"));
	check("op_return: Coldcard has no size limit and survives", r.signerCandidates.includes("Coldcard"));
}

{
	// pay-to-anchor output: Trezor rejects witness v1 with a 2-byte program, Ledger allows it
	const tx = {
		version: 2,
		locktime: 0,
		vin: [p2wpkhInput("d3".repeat(32), 0, 0xfffffffd, lowRSig, compressedPk)],
		vout: [
			out("anchor", "bc1pfeas", 0.00000330, "51024e73"),
			out("witness_v0_keyhash", "bc1qx", 0.0099, "0014" + "11".repeat(20))
		]
	};
	const txInputs = { 0: prevout("witness_v0_keyhash", "bc1qin", 0.01) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("anchor: an anchor output rules out Trezor", !r.signerCandidates.includes("Trezor device"));
	check("anchor: Ledger accepts undefined segwit programs", r.signerCandidates.includes("Ledger device"));
}

{
	// a fee at or above 10 percent of the outputs is refused by Coldcard firmware
	const tx = {
		version: 2,
		locktime: 0,
		vin: [p2wpkhInput("d4".repeat(32), 0, 0xfffffffd, lowRSig, compressedPk)],
		vout: [out("witness_v0_keyhash", "bc1qx", 0.008, "0014" + "11".repeat(20))]
	};
	const txInputs = { 0: prevout("witness_v0_keyhash", "bc1qin", 0.01) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("fee: a 25 percent fee rules out Coldcard", !r.signerCandidates.includes("Coldcard"));
	check("fee: the reason names the fee ratio", r.signals.some((s) => s.label === "Signing device" && /percent of the outputs/.test(s.implication)));
}

{
	// P2PK input: only Coldcard implements bare pubkey spends
	const tx = {
		version: 2,
		locktime: 0,
		vin: [{ txid: "d5".repeat(32), vout: 0, sequence: 0xfffffffd, scriptSig: { asm: lowRSig }, txinwitness: [] }],
		vout: [out("witness_v0_keyhash", "bc1qx", 0.0099, "0014" + "11".repeat(20))]
	};
	const txInputs = { 0: prevout("pubkey", null, 0.01) };
	const r = analyzeTransaction(tx, txInputs, 840001, 840002);

	check("p2pk: a bare pubkey input rules out Trezor and Ledger", !r.signerCandidates.includes("Trezor device") && !r.signerCandidates.includes("Ledger device"));
	check("p2pk: Coldcard is the only device that can spend it", r.signerVerdict === "Coldcard likely");
}

{
	// the survivor's untestable rules must be stated, so survival is not read as evidence
	const tx = {
		version: 1,
		locktime: 0,
		vin: [p2wpkhInput("d6".repeat(32), 0, 0xffffffff, lowRSig.slice(0, -2) + "81", compressedPk)],
		vout: [out("witness_v0_keyhash", "bc1qx", 0.01, "0014" + "11".repeat(20))]
	};
	const r = analyzeTransaction(tx, null, 960349, 960358);

	check("survivor: a firmware-policy exclusion grades likely", r.signerVerdict === "Coldcard likely");
	check("survivor: row explains what the grade rests on", r.signals.some((s) => s.label === "Signing device" && /only profiled device that could have signed this/.test(s.implication)));
	check("survivor: row lists the checks that could not run", r.signals.some((s) => s.label === "Signing device" && /could not test .*fee ceiling/.test(s.implication)));
	check("survivor: row notes rules that never exclude", r.signals.some((s) => s.label === "Signing device" && /never exclude anything/.test(s.implication)));
}

{
	// a taproot input excludes the stock firmware, but the EDGE build spends taproot,
	// so the exclusion must carry that caveat rather than reading as absolute
	const tx = {
		version: 2,
		locktime: 0,
		vin: [{ txid: "d7".repeat(32), vout: 0, sequence: 0xfffffffd, txinwitness: ["ab".repeat(64)], scriptSig: { asm: "" } }],
		vout: [out("witness_v1_taproot", "bc1ptr", 0.01, "5120" + "77".repeat(32))]
	};
	const r = analyzeTransaction(tx, null, 840001, 840002);

	check("edge: a taproot input still excludes the stock Coldcard", !r.signerCandidates.includes("Coldcard"));
	check("edge: the exclusion names the EDGE firmware caveat", r.signals.some((s) => s.label === "Signing device" && /EDGE build adds taproot spending/.test(s.implication)));
}

{
	// P2WSH 2-of-3 multisig: signatures sit in the witness stack alongside the script
	const wsig = "3044" + "0220" + "aa".repeat(32) + "0220" + "aa".repeat(32) + "01";
	const witnessScript = "52" + "21" + "02" + "bb".repeat(32) + "21" + "02" + "cc".repeat(32) + "21" + "02" + "dd".repeat(32) + "53ae";
	const tx = {
		version: 2,
		locktime: 840000,
		vin: Array.from({ length: 3 }, (_, i) => ({
			txid: "e1".repeat(32), vout: i, sequence: 0xfffffffd,
			txinwitness: ["", wsig, wsig, witnessScript], scriptSig: { asm: "" }
		})),
		vout: [out("witness_v0_keyhash", "bc1qx", 0.05, "0014" + "11".repeat(20))]
	};
	const r = analyzeTransaction(tx, null, 840001, 840002);

	check("multisig: signatures in a P2WSH witness are counted", r.signals.some((s) => s.label === "Low-R grinding" && /all 6/.test(s.value)));
	check("multisig: the witness script is not mistaken for a signature", !/all 9/.test(JSON.stringify(r.signals)));
	check("multisig: grinding eliminates the non-grinding devices", r.signerVerdict === "Coldcard possible");
}

{
	// P2SH legacy multisig: Bitcoin Core's asm strips the sighash byte and annotates it
	const bare = "3044" + "0220" + "aa".repeat(32) + "0220" + "aa".repeat(32);
	const redeem = "52" + "21" + "02" + "bb".repeat(32) + "21" + "02" + "cc".repeat(32) + "52ae";
	const tx = {
		version: 2,
		locktime: 840000,
		vin: Array.from({ length: 3 }, (_, i) => ({
			txid: "e2".repeat(32), vout: i, sequence: 0xfffffffd, txinwitness: [],
			scriptSig: { asm: `0 ${bare}[ALL] ${bare}[ALL] ${redeem}` }
		})),
		vout: [out("witness_v0_keyhash", "bc1qx", 0.05, "0014" + "11".repeat(20))]
	};
	const r = analyzeTransaction(tx, null, 840001, 840002);

	check("multisig: signatures in a legacy P2SH scriptSig are counted", r.signals.some((s) => s.label === "Low-R grinding" && /all 6/.test(s.value)));
	check("multisig: the redeem script is not mistaken for a signature", r.signerVerdict === "Coldcard possible");
}

(async () => {
	// multisig quorum pooling: a parent spending the same witness script is the same wallet,
	// so its signatures join the count without needing previous-output data
	const wsig = "3044" + "0220" + "aa".repeat(32) + "0220" + "aa".repeat(32) + "01";
	const hsig = "3045" + "0221" + "bb".repeat(33) + "0220" + "bb".repeat(32) + "01";
	const quorum = "52" + "21" + "02" + "bb".repeat(32) + "21" + "02" + "cc".repeat(32) + "21" + "02" + "dd".repeat(32) + "53ae";
	const otherQuorum = "52" + "21" + "02" + "ee".repeat(32) + "21" + "02" + "ff".repeat(32) + "52ae";

	const msIn = (txid, vout, script, sig) => ({ txid, vout, sequence: 0xfffffffd, txinwitness: ["", sig, sig, script], scriptSig: { asm: "" } });
	const parentTxid = "f1".repeat(32);
	const strangerTxid = "f2".repeat(32);

	const startTx = { txid: "f0".repeat(32), vin: [msIn(parentTxid, 0, quorum, wsig)], vout: [] };
	const parentTx = { txid: parentTxid, vin: [msIn("f9".repeat(32), 0, quorum, wsig), msIn("f9".repeat(32), 1, quorum, wsig)], vout: [] };

	const fetcher = async (txid) => (txid === parentTxid ? { tx: parentTx, txInputs: null } : null);
	const r = await gatherLinkedSignatures(startTx, null, fetcher, 4);

	check("quorum: a same-script parent is pooled without prevout data", r.linkedTxids.includes(parentTxid));
	check("quorum: its signatures are counted", r.low === 4 && r.high === 0);

	// a parent from a different quorum must not be pooled
	const strangerTx = { txid: strangerTxid, vin: [msIn("f8".repeat(32), 0, otherQuorum, wsig)], vout: [] };
	const startTx2 = { txid: "f3".repeat(32), vin: [msIn(strangerTxid, 0, quorum, wsig)], vout: [] };
	const r2 = await gatherLinkedSignatures(startTx2, null, async (t) => (t === strangerTxid ? { tx: strangerTx, txInputs: null } : null), 4);

	check("quorum: a different wallet's transaction is not pooled", r2.linkedTxids.length === 0 && r2.low === 0);

	// a high-R signature in the pool must count against the grinders, not be dropped
	const parentHigh = { txid: parentTxid, vin: [msIn("f7".repeat(32), 0, quorum, hsig)], vout: [] };
	const r3 = await gatherLinkedSignatures(startTx, null, async (t) => (t === parentTxid ? { tx: parentHigh, txInputs: null } : null), 4);

	check("quorum: pooled high-R signatures are counted too", r3.high === 2 && r3.low === 0);

})();
