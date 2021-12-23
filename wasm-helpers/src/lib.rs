use bitvec::prelude::*;
use js_sys::Array;
use log::{debug, info};
use std::fmt::Write;
use wasm_bindgen::prelude::*;

pub fn decode_hex(s: &str) -> Vec<u8> {
    (0..s.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&s[i..i + 2], 16).expect("Invalid hex digit"))
        .collect()
}

pub fn encode_hex(bytes: &[u8]) -> String {
    let mut s = String::with_capacity(bytes.len() * 2);
    for &b in bytes {
        write!(&mut s, "{:02X}", b).expect("Invalid hex digit");
    }
    s
}

#[wasm_bindgen]
pub fn encode(direction: i8, stripes: Vec<JsValue>) -> String {
    let stripes = stripes
        .into_iter()
        .map(|s| s.as_string().expect("Stripe must be a string"))
        .collect::<Vec<_>>();
    let res = encode_internal(direction, stripes);
    base64::encode_config(res.into_vec(), base64::URL_SAFE_NO_PAD)
}
fn encode_internal(direction: i8, stripes: Vec<String>) -> BitVec<Msb0, u8> {
    let curr_version = bitvec![0, 0, 0];
    let mut res: BitVec<Msb0, u8> = BitVec::new();
    res.extend(curr_version.iter());
    match direction {
        1 => {
            res.push(true);
        }
        -1 => {
            res.push(false);
        }
        _ => panic!("Invalid direction"),
    }
    for stripe in stripes {
        let stripe = decode_hex(&stripe);
        let bv: BitVec<Msb0, u8> = BitVec::from_vec(stripe);
        res.extend(bv.iter());
    }
    res
}
#[wasm_bindgen]
pub fn logging_setup() {
    wasm_logger::init(wasm_logger::Config::default());
    console_error_panic_hook::set_once();
}
struct DecoderOutput {
    direction: i8,
    stripes: Vec<String>,
}
#[wasm_bindgen]
pub fn decode(input: String) -> Array {
    let vec = base64::decode_config(&input, base64::URL_SAFE_NO_PAD).expect("Invalid base64");
    let input = BitVec::from_vec(vec);
    let decoded = decode_internal(input);
    let res = Array::new();
    res.push(&JsValue::from_f64(decoded.direction as f64));
    for stripe in decoded.stripes {
        res.push(&JsValue::from_str(&stripe));
    }
    res
}
fn decode_internal(input: BitVec<Msb0, u8>) -> DecoderOutput {
    let curr_version: u8 = input
        .get(0..3)
        .expect("Invalid current version")
        .load::<u8>();
    info!("curr_version: {:?}", curr_version);
    match curr_version {
        0 => (),
        _ => panic!("Unsupported version"),
    }
    let direction = if *input.get(3).expect("Invalid direction") {
        1
    } else {
        -1
    };
    info!("direction: {}", direction);
    let mut stripes: Vec<String> = Vec::new();
    let mut stripe_section = input.get(4..).expect("Failed to get stripes").to_bitvec();
    stripe_section.force_align();
    let stripes_chunks = stripe_section.chunks_exact(4 * 6);
    for chunk in stripes_chunks {
        debug!("stripe: {:?}", chunk);
        let chunk = chunk.to_bitvec().into_vec();
        let stripe = encode_hex(&chunk);
        stripes.push(stripe);
    }
    info!("stripes: {:?}", stripes);
    DecoderOutput { stripes, direction }
}

#[test]
fn test_encode() {
    let stripes: Vec<String> = vec!["D62900", "FF9B55", "FFFFFF", "D461A6", "A50062"]
        .into_iter()
        .map(|x| x.into())
        .collect();
    let direction = 1;
    let res = encode_internal(direction, stripes.clone());
    println!("res: {:?}", res);
    let d = decode_internal(res);
    assert_eq!(d.direction, direction);
    assert_eq!(d.stripes, stripes);
}
