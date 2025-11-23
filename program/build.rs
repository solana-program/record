//! Codama IDL build script.

use {
    codama::Codama,
    codama_korok_plugins::DefaultPlugin,
    std::{env, fs, path::Path},
};

fn main() {
    // Run the build script if the source files have changed, or if the
    // developer provides the GENERATE_IDL environment variable.
    //
    // ```
    // `GENERATE_IDL=1 cargo build`
    // ```
    //
    // The environment variable approach is useful if the local Codama has been
    // updated.
    println!("cargo:rerun-if-changed=src/");
    println!("cargo:rerun-if-env-changed=GENERATE_IDL");

    if let Err(e) = generate_idl() {
        println!("cargo:warning=Failed to generate IDL: {}", e);
    }
}

fn generate_idl() -> Result<(), Box<dyn std::error::Error>> {
    let manifest_dir = env::var("CARGO_MANIFEST_DIR")?;
    let crate_path = Path::new(&manifest_dir);

    let codama = Codama::load(crate_path)?
        .without_default_plugin()
        .add_plugin(DefaultPlugin); // Standard parsing

    let idl_json = codama.get_json_idl()?;

    // Parse and format the JSON with pretty printing.
    let parsed: serde_json::Value = serde_json::from_str(&idl_json)?;
    let mut formatted_json = serde_json::to_string_pretty(&parsed)?;

    // Add newline at the end to match standard formatting.
    formatted_json.push('\n');

    // Define output directory
    let out_dir = Path::new(&manifest_dir).join("idl");
    fs::create_dir_all(&out_dir)?;

    // Write to `spl_record.json`
    let idl_path = out_dir.join("spl_record.json");
    fs::write(&idl_path, formatted_json)?;

    println!("cargo:warning=IDL written to: {}", idl_path.display());

    Ok(())
}
