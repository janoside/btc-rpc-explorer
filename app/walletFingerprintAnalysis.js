"use strict";

const CATALOG = require("./walletFingerprints.json");
const WALLETS = Object.keys(CATALOG.wallets);
const SIGNERS = Object.keys(CATALOG.signers || {});

const STRONG_LOWR_SIGS = 6;

const REFERENCES = {
	"Anti-fee-sniping": "https://bitcoinops.org/en/topics/fee-sniping/",
	"nVersion": "https://github.com/bitcoin/bips/blob/master/bip-0068.mediawiki",
	"RBF signaling": "https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki",
	"nSequence value": "https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki",
	"Input script types": "https://en.bitcoin.it/wiki/Privacy#Wallet_fingerprinting",
	"Public keys": "https://en.bitcoin.it/wiki/Privacy#Wallet_fingerprinting",
	"Low-R grinding": "https://bitcoinops.org/en/topics/low-r-grinding/",
	"Signature hash type": "https://en.bitcoin.it/wiki/OP_CHECKSIG",
	"OP_RETURN output": "https://en.bitcoin.it/wiki/OP_RETURN",
	"Outputs": "https://bitcoinops.org/en/topics/payment-batching/",
	"Output ordering": "https://github.com/bitcoin/bips/blob/master/bip-0069.mediawiki",
	"Input ordering": "https://github.com/bitcoin/bips/blob/master/bip-0069.mediawiki",
	"Address reuse": "https://en.bitcoin.it/wiki/Privacy#Address_reuse",
	"Detected change output": "https://en.bitcoin.it/wiki/Privacy#Change_address_detection",
	"Change type": "https://en.bitcoin.it/wiki/Privacy#Change_address_detection",
	"Signing device": "https://en.bitcoin.it/wiki/Privacy#Wallet_fingerprinting"
};

const TYPE_MAP = {
	"pubkeyhash": "p2pkh",
	"scripthash": "p2sh",
	"witness_v0_keyhash": "p2wpkh",
	"witness_v0_scripthash": "p2wsh",
	"witness_v1_taproot": "p2tr",
	"nulldata": "op_return",
	"pubkey": "p2pk",
	"multisig": "multisig"
};

function mapType(coreType) {
	if (!coreType) {
		return "unknown";
	}

	return TYPE_MAP[coreType] || coreType;
}

function toSats(value) {
	if (value == null) {
		return null;
	}

	return Math.round(Number(value) * 1e8);
}

function normalize(tx, txInputs) {
	const inputs = [];
	for (let i = 0; i < tx.vin.length; i++) {
		const vin = tx.vin[i];
		const prevout = txInputs ? txInputs[i] : null;

		inputs.push({
			prevoutKey: `${vin.txid}:${vin.vout}`,
			txid: vin.txid,
			vout: vin.vout,
			sequence: vin.sequence,
			witness: vin.txinwitness || [],
			scriptSigAsm: (vin.scriptSig && vin.scriptSig.asm) || "",
			type: prevout ? mapType(prevout.scriptPubKey && prevout.scriptPubKey.type) : "unknown",
			address: prevout ? ((prevout.scriptPubKey && prevout.scriptPubKey.address) || null) : null,
			valueSat: prevout ? toSats(prevout.value) : null
		});
	}

	const outputs = tx.vout.map((vout) => ({
		type: mapType(vout.scriptPubKey && vout.scriptPubKey.type),
		address: (vout.scriptPubKey && vout.scriptPubKey.address) || null,
		scriptHex: (vout.scriptPubKey && vout.scriptPubKey.hex) || "",
		valueSat: toSats(vout.value)
	}));

	return { inputs, outputs };
}

function uniqueTypes(items) {
	return Array.from(new Set(items.map((x) => x.type)));
}

function looksLikePubkey(hex) {
	if (!hex || /[^0-9a-fA-F]/.test(hex)) {
		return false;
	}

	if (hex.length === 66 && (hex.substring(0, 2) === "02" || hex.substring(0, 2) === "03")) {
		return true;
	}

	return hex.length === 130 && hex.substring(0, 2) === "04";
}

function sigAndPubkeyHex(input) {
	// Single-key witness spend, native (P2WPKH) or nested in P2SH (BIP49): [signature, pubkey]
	if (input.witness.length === 2 && looksLikePubkey(input.witness[1])) {
		return { sig: input.witness[0], pubkey: input.witness[1] };
	}

	if (input.scriptSigAsm) {
		const parts = input.scriptSigAsm.trim().split(/\s+/).filter(Boolean);

		// P2PKH: <signature> <pubkey>
		if (parts.length === 2 && looksLikePubkey(parts[1])) {
			return { sig: parts[0], pubkey: parts[1] };
		}

		// P2PK: <signature>
		if (parts.length === 1 && parts[0].substring(0, 2) === "30") {
			return { sig: parts[0], pubkey: null };
		}
	}

	return { sig: null, pubkey: null };
}

// A DER signature as it appears on chain: 0x30, a length that matches the remaining bytes,
// and a trailing sighash byte. Checking the length guards against mistaking a redeem script
// or witness script that happens to start with 0x30 for a signature.
function looksLikeDerSig(hex) {
	if (!hex || hex.length < 16 || hex.substring(0, 2) !== "30" || /[^0-9a-fA-F]/.test(hex)) {
		return false;
	}

	const declared = parseInt(hex.substring(2, 4), 16);
	if (isNaN(declared)) {
		return false;
	}

	// Witness items carry the trailing sighash byte; Bitcoin Core's scriptSig asm strips it
	// and renders it separately as "[ALL]", so the bare form is two bytes shorter.
	if ((declared + 2) * 2 === hex.length) {
		return true;
	}

	if ((declared + 3) * 2 !== hex.length) {
		return false;
	}

	return [0x01, 0x02, 0x03, 0x81, 0x82, 0x83].includes(parseInt(hex.substring(hex.length - 2), 16));
}

// Every ECDSA signature in an input, whatever the script shape. Single-key spends carry one;
// multisig carries m of them, in the witness stack for P2WSH or in the scriptSig for P2SH.
function allSignatures(input) {
	const sigs = [];

	for (const item of input.witness) {
		if (looksLikeDerSig(item)) {
			sigs.push(item);
		}
	}

	if (sigs.length === 0 && input.scriptSigAsm) {
		for (const token of input.scriptSigAsm.trim().split(/\s+/)) {
			const hex = token.replace(/\[[A-Z|]+\]$/, "");
			if (looksLikeDerSig(hex)) {
				sigs.push(hex);
			}
		}
	}

	return sigs;
}

const SIGHASH_NAMES = {
	0x01: "SIGHASH_ALL",
	0x02: "SIGHASH_NONE",
	0x03: "SIGHASH_SINGLE",
	0x81: "SIGHASH_ALL|ANYONECANPAY",
	0x82: "SIGHASH_NONE|ANYONECANPAY",
	0x83: "SIGHASH_SINGLE|ANYONECANPAY"
};

function sighashName(byte) {
	return SIGHASH_NAMES[byte] || ("0x" + byte.toString(16));
}

function sighashOf(input) {
	// Taproot key-path spend: a single 64-byte (implicit SIGHASH_DEFAULT) or 65-byte witness element
	if ((input.type === "p2tr" || input.type === "unknown") && input.witness.length === 1) {
		const w = input.witness[0];
		if (w.length === 128) {
			return "SIGHASH_DEFAULT";
		}
		if (w.length === 130) {
			return sighashName(parseInt(w.substring(128), 16));
		}

		return null;
	}

	// Single-key witness spend: the raw DER signature ends with the sighash byte
	if (input.witness.length === 2 && looksLikePubkey(input.witness[1])) {
		const wsig = input.witness[0];
		if (wsig.substring(0, 2) === "30" && wsig.length >= 4) {
			return sighashName(parseInt(wsig.substring(wsig.length - 2), 16));
		}

		return null;
	}

	// Legacy scriptSig: Bitcoin Core renders the sighash type as an annotation, e.g. "[ALL]"
	if (input.scriptSigAsm) {
		const m = input.scriptSigAsm.match(/\[([A-Z|]+)\]/);
		if (m) {
			return "SIGHASH_" + m[1];
		}
	}

	// Multisig and other multi-element witnesses: read the flag off the signatures themselves
	const sigs = allSignatures(input);
	if (sigs.length > 0) {
		return sighashName(parseInt(sigs[0].substring(sigs[0].length - 2), 16));
	}

	return null;
}

function compressedKeysOnly(inputs) {
	for (const input of inputs) {
		const { pubkey } = sigAndPubkeyHex(input);
		if (pubkey && pubkey.length >= 2 && pubkey.substring(0, 2) === "04") {
			return false;
		}
	}

	return true;
}

// A taproot key-path spend is a single 64-byte (or 65-byte with an explicit sighash byte)
// witness element, and a script-path spend ends with a control block. Both are visible in
// the witness, so a taproot spend can still be recognized without previous-output data.
function witnessLooksTaproot(input) {
	if (input.type === "p2tr") {
		return true;
	}

	if (input.type !== "unknown") {
		return false;
	}

	if (input.witness.length === 1) {
		return input.witness[0].length === 128 || input.witness[0].length === 130;
	}

	if (input.witness.length >= 2) {
		const control = input.witness[input.witness.length - 1];
		const lead = control.substring(0, 2);
		return control.length >= 66 && (control.length - 2) % 64 === 0 && (lead === "c0" || lead === "c1");
	}

	return false;
}

// Walk an OP_RETURN scriptPubKey and report the structure the signing firmwares check:
// total size, how many pushes it carries, and whether it uses OP_PUSHDATA2/OP_PUSHDATA4.
function parseOpReturn(scriptHex) {
	const bytes = [];
	for (let i = 0; i < scriptHex.length; i += 2) {
		bytes.push(parseInt(scriptHex.substring(i, i + 2), 16));
	}

	const result = { scriptBytes: bytes.length, pushes: 0, pushdata2: false, parsed: true };
	let offset = 1;

	while (offset < bytes.length) {
		const opcode = bytes[offset++];
		let dataLen = 0;

		if (opcode <= 75) {
			dataLen = opcode;
		} else if (opcode === 0x4c) {
			dataLen = bytes[offset++];
		} else if (opcode === 0x4d) {
			result.pushdata2 = true;
			dataLen = bytes[offset] + (bytes[offset + 1] << 8);
			offset += 2;
		} else if (opcode === 0x4e) {
			result.pushdata2 = true;
			dataLen = bytes[offset] + (bytes[offset + 1] << 8) + (bytes[offset + 2] << 16) + (bytes[offset + 3] << 24);
			offset += 4;
		} else if (opcode === 0x00 || (opcode >= 0x4f && opcode <= 0x60)) {
			// OP_0, OP_1NEGATE and OP_1..OP_16 are pushes that carry no following bytes
			dataLen = 0;
		} else {
			result.parsed = false;
			return result;
		}

		if (isNaN(dataLen) || offset + dataLen > bytes.length) {
			result.parsed = false;
			return result;
		}

		offset += dataLen;
		result.pushes++;
	}

	return result;
}

function uncompressedKeyOutsideP2pk(inputs) {
	for (const input of inputs) {
		if (input.type === "p2pk") {
			continue;
		}

		const { pubkey } = sigAndPubkeyHex(input);
		if (pubkey && pubkey.substring(0, 2) === "04") {
			return true;
		}
	}

	return false;
}

function ecdsaSignatureStats(inputs) {
	let examined = 0;
	let lowR = 0;
	let highR = 0;

	for (const input of inputs) {
		for (const sig of allSignatures(input)) {
			const rLen = parseInt(sig.substring(6, 8), 16);
			if (isNaN(rLen)) {
				continue;
			}

			examined++;
			if (rLen > 32) {
				highR++;
			} else {
				lowR++;
			}
		}
	}

	return { examined, lowR, highR };
}

function bip69InputsSorted(inputs) {
	if (inputs.length <= 1) {
		return true;
	}

	const keys = inputs.map((i) => `${i.txid}:${String(i.vout).padStart(10, "0")}`);
	const sorted = keys.slice().sort();
	return JSON.stringify(keys) === JSON.stringify(sorted);
}

function bip69OutputsSorted(outputs) {
	if (outputs.length <= 1) {
		return true;
	}

	const pairs = outputs.map((o) => [o.valueSat, o.scriptHex]);
	const sorted = pairs.slice().sort((a, b) => {
		if (a[0] !== b[0]) {
			return a[0] - b[0];
		}

		return a[1].localeCompare(b[1]);
	});

	return JSON.stringify(pairs) === JSON.stringify(sorted);
}

function getChangeIndex(inputs, outputs) {
	if (outputs.length === 1) {
		return -1;
	}

	const inputTypes = inputs.map((i) => i.type);
	const outputTypes = outputs.map((o) => o.type);

	if (new Set(inputTypes).size === 1) {
		const matchCount = outputTypes.filter((t) => t === inputTypes[0]).length;
		if (matchCount === 1) {
			return outputTypes.indexOf(inputTypes[0]);
		}
	}

	const inputAddrs = new Set(inputs.map((i) => i.address).filter(Boolean));
	const sharedAddrIndexes = [];
	outputs.forEach((o, idx) => {
		if (o.address && inputAddrs.has(o.address)) {
			sharedAddrIndexes.push(idx);
		}
	});
	if (sharedAddrIndexes.length === 1) {
		return sharedAddrIndexes[0];
	}

	const inputValues = inputs.map((i) => i.valueSat).filter((v) => v != null);
	if (outputs.length === 2 && inputValues.length === inputs.length && inputValues.length > 0) {
		const minInput = Math.min(...inputValues);
		const belowMinInput = [];
		outputs.forEach((o, idx) => {
			if (o.valueSat != null && o.valueSat < minInput) {
				belowMinInput.push(idx);
			}
		});
		if (belowMinInput.length === 1) {
			return belowMinInput[0];
		}
	}

	const nonRoundIndexes = [];
	outputs.forEach((o, idx) => {
		if (o.valueSat != null && o.valueSat % 100 !== 0) {
			nonRoundIndexes.push(idx);
		}
	});
	if (nonRoundIndexes.length === 1) {
		return nonRoundIndexes[0];
	}

	return -2;
}

function addressReuse(inputs, outputs) {
	const inputAddrs = new Set(inputs.map((i) => i.address).filter(Boolean));
	return outputs.some((o) => o.address && inputAddrs.has(o.address));
}

function matchCatalog(f) {
	if (f.version !== 1 && f.version !== 2) {
		return [];
	}

	if (f.compressed === false) {
		return [];
	}

	return WALLETS.filter((name) => {
		const p = CATALOG.wallets[name];

		if (p.version !== f.version) {
			return false;
		}

		if (f.antiFeeSniping && p.anti_fee_sniping === "never") {
			return false;
		}
		if (!f.antiFeeSniping && p.anti_fee_sniping === "always") {
			return false;
		}

		if (f.rbf) {
			if (p.rbf === "never") {
				return false;
			}
			if (p.rbf === "native_segwit_only" && f.haveInputData && !f.onlyNativeSegwit) {
				return false;
			}
		} else {
			if (p.rbf === "always") {
				return false;
			}
			if (p.rbf === "native_segwit_only" && f.onlyNativeSegwit) {
				return false;
			}
		}

		if (p.nsequence && f.sequences && f.sequences.length > 0) {
			const allowed = p.nsequence.map((h) => parseInt(h, 16));
			if (!f.sequences.every((s) => allowed.includes(s))) {
				return false;
			}
		}

		if (f.haveInputData && f.multiType && p.multi_type_vin === "no") {
			return false;
		}

		if (f.lowR === "high" && p.low_r === "always") {
			return false;
		}
		if (f.lowR === "strong_low" && p.low_r === "no") {
			return false;
		}

		if (f.opReturn && p.op_return === "no") {
			return false;
		}

		if (f.batched && p.batching === "single") {
			return false;
		}

		if (f.outputsBip69 === false && p.bip69 === "always") {
			return false;
		}
		if (f.inputsBip69 === false && p.bip69 === "always") {
			return false;
		}

		if (f.haveInputData && f.reuse === true && p.address_reuse === "no") {
			return false;
		}
		if (f.haveInputData && f.reuse === false && p.address_reuse === "yes") {
			return false;
		}

		if (f.changePosition === "not_last" && p.change_position === "last") {
			return false;
		}

		if (f.changeType === "payment" && p.change_type !== "payment") {
			return false;
		}
		if (f.changeType === "input" && p.change_type === "payment") {
			return false;
		}

		return true;
	});
}

// A signing device only leaves fingerprints in the signatures and in what it refuses
// to sign, so it is matched on its own facts instead of the wallet catalog. Returns the
// reason the device is incompatible with this transaction, or null if it is still possible.
// Rules a signer carries that this transaction could not test, either because they need
// previous-output data or because the firmware is permissive enough that they never exclude.
function untestedConstraints(name, f) {
	const p = CATALOG.signers[name];
	const gaps = [];

	if (p.input_types && !f.inputTypes) {
		gaps.push("which input scripts it can spend");
	}
	if (p.max_fee_percent != null && f.feePercent == null) {
		gaps.push("its fee ceiling");
	}
	if (p.max_fee_rate_sat_vb != null && f.feeRateSatVb == null) {
		gaps.push("its fee rate ceiling");
	}
	if (p.output_types === "any" && p.op_return_max_pushes == null && p.op_return_max_script_bytes == null) {
		gaps.push("its output rules, which never exclude anything because the firmware accepts any script");
	}

	return gaps;
}

function article(word) {
	return "aeiou".includes(word.charAt(0)) ? "an" : "a";
}

function signerEliminationReason(name, f) {
	const p = CATALOG.signers[name];

	// Grinding is a firmware behavior, so it can only rule the signer out for
	// transactions mined after the firmware that introduced it.
	const grinding = p.low_r === "always"
		&& (!p.low_r_since_height || !f.referenceHeight || f.referenceHeight >= p.low_r_since_height);

	if (f.lowR === "high" && grinding) {
		return {
			rule: "statistical",
			text: p.low_r_since_height
				? `a high-R signature, and it has ground every signature since block ${p.low_r_since_height}`
				: "a high-R signature, and it grinds every signature"
		};
	}

	if (f.lowR === "strong_low" && p.low_r === "no") {
		return { rule: "statistical", text: "deliberate low-R grinding, which it never does" };
	}

	if (p.input_types && f.inputTypes) {
		const unsupported = f.inputTypes.filter((t) => t !== "unknown" && !p.input_types.includes(t));
		if (unsupported.length > 0) {
			const note = p.input_types_note ? ` (${p.input_types_note})` : "";
			return { rule: "capability", text: `${article(unsupported[0])} ${unsupported.join(", ")} input, which its firmware cannot spend${note}` };
		}
	}

	if (p.output_types && p.output_types !== "any" && f.outputTypes) {
		const unsupported = f.outputTypes.filter((t) => !p.output_types.includes(t));
		if (unsupported.length > 0) {
			return { rule: "capability", text: `${article(unsupported[0])} ${unsupported.join(", ")} output, which its firmware cannot pay to` };
		}
	}

	for (const o of f.opReturns) {
		if (p.op_return_max_script_bytes != null && o.scriptBytes > p.op_return_max_script_bytes) {
			return { rule: "capability", text: `an OP_RETURN output of ${o.scriptBytes} script bytes, above the ${p.op_return_max_script_bytes} its firmware accepts` };
		}
		if (p.op_return_max_pushes != null && o.parsed && o.pushes > p.op_return_max_pushes) {
			return { rule: "capability", text: `an OP_RETURN output carrying ${o.pushes} pushes, and its firmware only ever writes ${p.op_return_max_pushes}` };
		}
		if (p.op_return_pushdata2 === false && o.pushdata2) {
			return { rule: "capability", text: "an OP_RETURN output using OP_PUSHDATA2 or OP_PUSHDATA4, which its firmware rejects" };
		}
		if (p.op_return_nonzero_value === false && o.valueSat > 0) {
			return { rule: "capability", text: "an OP_RETURN output carrying value, and its firmware requires a zero amount" };
		}
	}

	if (p.max_fee_percent != null && f.feePercent != null && f.feePercent >= p.max_fee_percent) {
		return { rule: "capability", text: `a fee worth ${f.feePercent.toFixed(1)} percent of the outputs, at or above the ${p.max_fee_percent} percent its firmware refuses to sign` };
	}

	if (p.max_fee_rate_sat_vb != null && f.feeRateSatVb != null && f.feeRateSatVb > p.max_fee_rate_sat_vb) {
		return { rule: "capability", text: `a fee rate of ${Math.round(f.feeRateSatVb)} sat/vB, above the ${p.max_fee_rate_sat_vb} its firmware refuses to sign` };
	}

	if (f.uncompressedOutsideP2pk && p.uncompressed_keys !== "yes") {
		return { rule: "capability", text: p.uncompressed_keys === "p2pk_only"
			? "an uncompressed public key outside a P2PK input"
			: "an uncompressed public key, which it never signs for" };
	}

	if (p.sighash && f.sighashes.length > 0) {
		const refused = f.sighashes.filter((s) => !p.sighash.includes(s));
		if (refused.length > 0) {
			return { rule: "capability", text: refused.join(", ") + ", which it will not sign with default settings" };
		}
	}

	return null;
}

function matchSigners(f) {
	return SIGNERS.filter((name) => signerEliminationReason(name, f) === null);
}

// A device is "likely" only when every other profiled device is excluded by a firmware
// capability or policy, which the device would refuse outright. Exclusions that rest on
// signature statistics (grinding) are weaker, because coordinator software grinds too.
function signerStrength(candidates, eliminated, f) {
	if (candidates.length !== 1) {
		return "possible";
	}

	const allCapability = eliminated.every((name) => signerEliminationReason(name, f).rule === "capability");
	return allCapability ? "likely" : "possible";
}

function analyzeTransaction(tx, txInputs, txBlockHeight, currentBlockHeight, extraSignatures) {
	if (!tx || !tx.vin || !tx.vout || (tx.vin[0] && tx.vin[0].coinbase)) {
		return { available: false };
	}

	const { inputs, outputs } = normalize(tx, txInputs);
	const haveInputData = inputs.every((i) => i.type !== "unknown");

	const signals = [];
	const add = (label, value, implication, privacy) => signals.push({ label, value, implication, privacy });

	const inTypes = uniqueTypes(inputs);
	const referenceHeight = (txBlockHeight && txBlockHeight > 0) ? txBlockHeight : currentBlockHeight;

	const facts = {
		version: tx.version,
		haveInputData,
		antiFeeSniping: tx.locktime > 0,
		rbf: inputs.some((i) => i.sequence != null && i.sequence < 0xfffffffe),
		sequences: Array.from(new Set(inputs.map((i) => i.sequence).filter((s) => s != null))),
		onlyNativeSegwit: haveInputData && inTypes.every((t) => t === "p2wpkh"),
		multiType: inTypes.length > 1,
		compressed: compressedKeysOnly(inputs),
		uncompressedOutsideP2pk: uncompressedKeyOutsideP2pk(inputs),
		referenceHeight,
		taprootSpend: inputs.some(witnessLooksTaproot),
		inputTypes: haveInputData
			? inTypes
			: (inputs.some(witnessLooksTaproot) ? ["p2tr"] : null),
		outputTypes: Array.from(new Set(outputs.map((o) => o.type))),
		opReturns: outputs
			.filter((o) => o.type === "op_return")
			.map((o) => Object.assign(parseOpReturn(o.scriptHex), { valueSat: o.valueSat })),
		feePercent: null,
		feeRateSatVb: null,
		sighashes: [],
		lowR: "none",
		opReturn: outputs.some((o) => o.type === "op_return"),
		batched: outputs.length > 2,
		outputsBip69: outputs.length > 1 ? bip69OutputsSorted(outputs) : null,
		inputsBip69: inputs.length > 1 ? bip69InputsSorted(inputs) : null,
		reuse: haveInputData ? addressReuse(inputs, outputs) : null,
		changePosition: "none",
		changeType: "none"
	};

	// The fee is only knowable when every previous output is available.
	if (haveInputData && inputs.every((i) => i.valueSat != null)) {
		const totalIn = inputs.reduce((sum, i) => sum + i.valueSat, 0);
		const totalOut = outputs.reduce((sum, o) => sum + (o.valueSat || 0), 0);
		const fee = totalIn - totalOut;
		if (fee >= 0 && totalOut > 0) {
			facts.feePercent = (fee * 100) / totalOut;
		}
		if (fee >= 0 && tx.vsize > 0) {
			facts.feeRateSatVb = fee / tx.vsize;
		}
	}

	if (!facts.antiFeeSniping) {
		add("Anti-fee-sniping", "No (nLockTime = 0)",
			"Most wallets leave nLockTime at 0, which does not narrow much but rules out the wallets that always set it (Sparrow and Bull Bitcoin, plus Bitcoin Core and Electrum which set it most of the time).",
			null);
	} else {
		let detail = `nLockTime = ${tx.locktime}`;
		if (referenceHeight && referenceHeight > 0) {
			const delta = referenceHeight - tx.locktime;
			detail += (delta >= 0 && delta < 100) ? " (near chain tip)" : ` (${delta} blocks below tip)`;
		}

		add("Anti-fee-sniping", detail,
			"nLockTime set near the chain tip is the anti-fee-sniping pattern. Only wallets that do this are possible: Bitcoin Core, Electrum, Sparrow, Bull Bitcoin, Liana, Nunchuk and Wasabi.",
			"A non-zero locktime narrows the wallet to the anti-fee-sniping set.");
	}

	if (tx.version === 1) {
		add("nVersion", "1", "Transaction version 1 is used by Trust Wallet, Trezor and Ledger.", null);
	} else if (tx.version === 2) {
		add("nVersion", "2", "Version 2 rules out the wallets that still emit version-1 transactions (Ledger, Trezor, Trust).", null);
	} else {
		add("nVersion", String(tx.version), "Non-standard transaction version.", null);
	}

	if (facts.rbf) {
		add("RBF signaling", "Yes (nSequence < 0xFFFFFFFE)",
			"Opt-in Replace-By-Fee. Wallets that default to no RBF (Coinbase, Exodus, Wasabi) are ruled out.", null);
	} else {
		add("RBF signaling", "No (nSequence >= 0xFFFFFFFE)",
			"No RBF opt-in. The wallets that always signal RBF are ruled out: Bitcoin Core, Electrum, Ledger, Trezor, Trust, Sparrow, Bull Bitcoin, Liana and Nunchuk. Wallets that default to no RBF remain possible: Coinbase, Exodus, Wasabi, Cake (when spending unconfirmed coins), and Blue Wallet for its legacy, P2SH and taproot wallets.",
			null);
	}

	if (facts.sequences.length > 0) {
		const seqHexes = facts.sequences.map((s) => "0x" + s.toString(16).padStart(8, "0"));
		add("nSequence value", seqHexes.join(", "),
			"The exact nSequence value is wallet-specific: 0x80000000 is Blue Wallet's native segwit wallet; 0xFFFFFFFD is used by most RBF wallets (Bitcoin Core, Electrum, Sparrow, Liana, Bull Bitcoin, Cake); 0xFFFFFFFF by wallets that default to no RBF (Coinbase, Exodus, Wasabi).",
			null);
	}

	if (haveInputData) {
		if (inTypes.length > 1) {
			add("Input script types", inTypes.join(", "),
				"Spending more than one address type in one transaction is uncommon; most wallets use a single type.",
				"Mixing input types both fingerprints the wallet and links otherwise-separate address types to one owner.");
		} else {
			add("Input script types", inTypes[0] || "n/a", "All inputs share one script type.", null);
		}
	}

	// Signatures and public keys are carried in the input scripts and witnesses, so these
	// checks work from the raw transaction alone and must not be gated on previous-output
	// data, which a pruned node cannot supply.
	{
		const pubkeysSeen = inputs.filter((i) => sigAndPubkeyHex(i).pubkey).length;

		if (facts.compressed && pubkeysSeen > 0) {
			add("Public keys", "Compressed", "Compressed ECDSA public keys (standard for all modern wallets).", null);
		} else if (!facts.compressed) {
			add("Public keys", "Uncompressed key present",
				"Uncompressed public keys are legacy behavior and rare today.",
				"An uncompressed key is a strong, unusual fingerprint.");
		}

		const sigStats = ecdsaSignatureStats(inputs);
		const linked = extraSignatures || { low: 0, high: 0, linkedTxids: [] };
		const linkedCount = linked.linkedTxids ? linked.linkedTxids.length : 0;
		const totalHigh = sigStats.highR + (linked.high || 0);
		const totalLow = sigStats.lowR + (linked.low || 0);
		const totalExamined = totalLow + totalHigh;
		const across = linkedCount > 0 ? ` across this transaction and ${linkedCount} linked transaction(s)` : "";

		if (totalExamined > 0) {
			if (totalHigh > 0) {
				facts.lowR = "high";
				add("Low-R grinding", `No (${totalHigh} of ${totalExamined} ECDSA signature(s)${across} have a 33-byte R value)`,
					"A wallet that grinds for low-R signatures would never produce a high-R one, so a high-R signature rules out the grinding wallets (Bitcoin Core, Electrum, Sparrow, Bull Bitcoin, Liana) and the signing devices that always grind (Coldcard).",
					null);
			} else if (totalExamined >= STRONG_LOWR_SIGS) {
				facts.lowR = "strong_low";
				add("Low-R grinding", `Yes (all ${totalExamined} ECDSA signature(s)${across} are low-R)`,
					`The chance of ${totalExamined} low-R signatures occurring by luck is about 1 in ${Math.pow(2, totalExamined)}, so this is strong evidence of deliberate low-R grinding (Bitcoin Core, Electrum, Sparrow, Bull Bitcoin, Liana). The grinding can also come from the signing device rather than the software that built the transaction, since a Coldcard grinds every signature.`,
					null);
			} else {
				facts.lowR = "low";
				add("Low-R grinding", `All ${totalExamined} ECDSA signature(s)${across} are low-R (32-byte R or smaller)`,
					`A non-grinding wallet still produces a low-R signature about half the time, so this is weak evidence (roughly 1 in ${Math.pow(2, totalExamined)}). Following the change chain to gather more of this wallet's signatures would strengthen or refute it.`,
					null);
			}
		}
	}

	const sighashes = Array.from(new Set(inputs.map(sighashOf).filter(Boolean)));
	facts.sighashes = sighashes;
	const nonStandardSighash = sighashes.filter((s) => s !== "SIGHASH_ALL" && s !== "SIGHASH_DEFAULT");
	if (nonStandardSighash.length > 0) {
		add("Signature hash type", sighashes.join(", "),
			"Most wallets sign every input with SIGHASH_ALL (or SIGHASH_DEFAULT for taproot). A different flag is uncommon and usually indicates a collaborative transaction such as a coinjoin or a PSBT signed across wallets.",
			"A non-default sighash flag is a strong and unusual fingerprint.");
	}

	if (facts.opReturn) {
		add("OP_RETURN output", "Yes",
			"This transaction embeds data in an OP_RETURN output, which several wallets never create.", null);
	}

	if (facts.batched) {
		add("Outputs", `${outputs.length} (batched)`,
			"More than two outputs (batched payment) is something several single-recipient wallets never do.", null);
	}

	if (outputs.length > 1) {
		if (facts.outputsBip69) {
			add("Output ordering", "BIP-69 (lexicographic)",
				"Outputs are sorted per BIP-69. Deterministic ordering is itself a fingerprint; only some wallets do it.", null);
		} else {
			add("Output ordering", "Not BIP-69",
				"Outputs are not in BIP-69 order, ruling out wallets that always sort (Electrum, Trezor).", null);
		}
	}

	if (inputs.length > 1) {
		if (facts.inputsBip69) {
			add("Input ordering", "BIP-69 (lexicographic)", "Inputs are sorted per BIP-69.", null);
		} else {
			add("Input ordering", "Not BIP-69",
				"Inputs are not in BIP-69 order, ruling out wallets that always sort (Electrum, Trezor).", null);
		}
	}

	if (haveInputData) {
		if (facts.reuse) {
			add("Address reuse", "Yes (an output reuses an input address)",
				"Paying back to an address that was just spent. Most modern wallets avoid this.",
				"Address reuse directly links transactions and is one of the most damaging privacy leaks.");
		} else {
			add("Address reuse", "No", "No input address is reused as an output.", null);
		}

		const changeIndex = getChangeIndex(inputs, outputs);
		if (changeIndex >= 0) {
			const isLast = changeIndex === outputs.length - 1;
			facts.changePosition = isLast ? "last" : "not_last";
			add("Detected change output", `index ${changeIndex}${isLast ? " (last)" : " (not last)"}`,
				"Heuristic change detection (single matching script type / reused address / non-round amount).",
				"A predictable change position lets an observer separate the payment from the change.");

			const changeType = outputs[changeIndex].type;
			const otherOutputTypes = outputs.filter((_, i) => i !== changeIndex).map((o) => o.type);
			const matchesInput = inTypes.includes(changeType);
			const matchesOutput = otherOutputTypes.includes(changeType);
			if (matchesOutput && !matchesInput) {
				facts.changeType = "payment";
				add("Change type", "Matches the payment output type",
					"Bitcoin Core derives change matching the payment type; other wallets match the input type.", null);
			} else if (matchesInput && !matchesOutput) {
				facts.changeType = "input";
				add("Change type", "Matches the input type",
					"Change script type follows the inputs, which is what most non-Core wallets do.", null);
			}
		}
	}

	const candidates = matchCatalog(facts);
	const signerCandidates = matchSigners(facts);

	// Nothing in a transaction positively identifies a signing device, so the row is only
	// worth showing when at least one device has been eliminated. Reporting "not ruled out"
	// when no device is eliminated would fire on almost every ordinary transaction.
	const signersEliminated = SIGNERS.filter((name) => !signerCandidates.includes(name));

	let signerVerdict = null;
	let signerVerdictClass = null;

	if (signersEliminated.length > 0) {
		const preface = "A signing device does not build the transaction, so it is matched only on the signatures and on what it refuses to sign. ";
		const because = "Ruled out by " + signersEliminated.map((name) => `${name}: ${signerEliminationReason(name, facts).text}`).join("; ") + ".";

		let tail = "";
		if (signerCandidates.length === 0) {
			signerVerdict = signersEliminated.join(", ") + " ruled out";
			signerVerdictClass = "secondary";
		} else {
			const strength = signerStrength(signerCandidates, signersEliminated, facts);
			signerVerdict = signerCandidates.join(", ") + " " + strength;
			signerVerdictClass = strength === "likely" ? "success" : "info";

			tail = strength === "likely"
				? ` Every other profiled device is excluded by a firmware rule it would refuse outright, which leaves ${signerCandidates.join(", ")} as the only profiled device that could have signed this.`
				: ` That leaves ${signerCandidates.join(", ")}, on exclusions that rest on signature statistics rather than firmware limits, so coordinator software could account for them equally well.`;

			const gaps = signerCandidates
				.map((name) => ({ name, gaps: untestedConstraints(name, facts) }))
				.filter((entry) => entry.gaps.length > 0)
				.map((entry) => `${entry.name} (${entry.gaps.join(", ")})`);

			if (gaps.length > 0) {
				tail += " This transaction could not test " + gaps.join("; ") + ".";
			}
		}

		add("Signing device", signerVerdict, preface + because + tail, null);
	}

	signals.forEach((s) => { s.reference = REFERENCES[s.label] || null; });

	let verdict;
	let verdictClass;
	if (candidates.length === 0) {
		verdict = "Other / none of the profiled wallets";
		verdictClass = "secondary";
	} else if (candidates.length === 1) {
		verdict = candidates[0];
		verdictClass = "success";
	} else {
		verdict = `Unclear: ${candidates.join(", ")}`;
		verdictClass = "warning";
	}

	return {
		available: true,
		haveInputData,
		signals,
		walletCandidates: candidates,
		verdict,
		verdictClass,
		signerCandidates,
		signerVerdict,
		signerVerdictClass,
		disclaimer: "Fingerprints are heuristic and probabilistic. A transaction may match a wallet it was not made with or unlisted wallet. It is also possible that the transaction was created and signed using different wallets."
	};
}

// The witness script of a P2WSH spend, or the redeem script of a P2SH one, identifies the
// multisig quorum. Two inputs carrying the same script belong to the same wallet, which lets
// signatures be pooled across transactions without needing previous-output data.
function quorumScripts(inputs) {
	const scripts = new Set();

	for (const input of inputs) {
		if (input.witness.length >= 3) {
			const last = input.witness[input.witness.length - 1];
			if (last && !looksLikeDerSig(last)) {
				scripts.add(last);
			}
			continue;
		}

		if (input.scriptSigAsm) {
			const tokens = input.scriptSigAsm.trim().split(/\s+/).filter(Boolean);
			const last = tokens[tokens.length - 1];
			if (tokens.length >= 3 && last && !looksLikeDerSig(last.replace(/\[[A-Z|]+\]$/, ""))) {
				scripts.add(last);
			}
		}
	}

	return scripts;
}

// Signatures from inputs that belong to the same quorum as the transaction being analyzed.
function quorumSignatureStats(inputs, scripts) {
	const matching = inputs.filter((input) => {
		for (const script of quorumScripts([input])) {
			if (scripts.has(script)) {
				return true;
			}
		}

		return false;
	});

	return ecdsaSignatureStats(matching);
}

async function findSelfChangeParent(tx, txInputs, fetchTxWithInputs, seen) {
	const start = normalize(tx, txInputs);
	if (!start.inputs.every((i) => i.type !== "unknown")) {
		return null;
	}

	for (let i = 0; i < tx.vin.length; i++) {
		const vin = tx.vin[i];
		if (!vin || vin.coinbase || !vin.txid || seen.has(vin.txid)) {
			continue;
		}

		const parent = await fetchTxWithInputs(vin.txid);
		if (!parent || !parent.tx || !parent.tx.vout) {
			continue;
		}

		const parentNorm = normalize(parent.tx, parent.txInputs);
		if (!parentNorm.inputs.every((p) => p.type !== "unknown")) {
			continue;
		}

		const parentChange = getChangeIndex(parentNorm.inputs, parentNorm.outputs);
		if (parentChange >= 0 && parentChange === vin.vout) {
			return parent;
		}
	}

	return null;
}

async function gatherLinkedSignatures(startTx, startTxInputs, fetchTxWithInputs, maxHops) {
	const result = { low: 0, high: 0, linkedTxids: [] };
	if (typeof fetchTxWithInputs !== "function" || !startTx || !startTx.txid) {
		return result;
	}

	const seen = new Set([startTx.txid]);
	let curTx = startTx;
	let curInputs = startTxInputs;

	for (let hop = 0; hop < maxHops; hop++) {
		let parent = null;
		try {
			parent = await findSelfChangeParent(curTx, curInputs, fetchTxWithInputs, seen);
		} catch (err) {
			break;
		}

		if (!parent) {
			break;
		}

		const stats = ecdsaSignatureStats(normalize(parent.tx, parent.txInputs).inputs);
		result.low += stats.lowR;
		result.high += stats.highR;
		result.linkedTxids.push(parent.tx.txid);

		seen.add(parent.tx.txid);
		curTx = parent.tx;
		curInputs = parent.txInputs;
	}

	// Multisig gives a second route that does not need previous-output data: a parent input
	// carrying the same witness or redeem script is the same quorum, so its signatures come
	// from the same set of devices and can be pooled.
	const scripts = quorumScripts(normalize(startTx, startTxInputs).inputs);
	if (scripts.size > 0) {
		for (const vin of startTx.vin) {
			if (result.linkedTxids.length >= maxHops) {
				break;
			}
			if (!vin || vin.coinbase || !vin.txid || seen.has(vin.txid)) {
				continue;
			}

			let parent = null;
			try {
				parent = await fetchTxWithInputs(vin.txid);
			} catch (err) {
				continue;
			}

			if (!parent || !parent.tx || !parent.tx.vin) {
				continue;
			}

			seen.add(vin.txid);
			const stats = quorumSignatureStats(normalize(parent.tx, parent.txInputs).inputs, scripts);
			if (stats.examined > 0) {
				result.low += stats.lowR;
				result.high += stats.highR;
				result.linkedTxids.push(parent.tx.txid);
			}
		}
	}

	return result;
}

module.exports = {
	analyzeTransaction,
	gatherLinkedSignatures,
	WALLETS,
	SIGNERS
};
