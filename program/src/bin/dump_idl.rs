use codama::Codama;
use std::{fs::File, io::Write, path::Path};

fn main() {
    let crate_path = Path::new(env!("CARGO_MANIFEST_DIR"));
    let codama = Codama::load(crate_path).expect("Failed to load Codama from crate");

    let json = codama.get_json_idl().expect("Failed to generate JSON IDL");

    let output_path = "./program/idl.json";
    let mut file = File::create(output_path).expect("Failed to create idl.json");
    file.write_all(json.as_bytes())
        .expect("Failed to write IDL to file");

    println!("✅ Success! IDL extracted to: {}", output_path);
}
