use {
    mollusk_svm::{result::Check, Mollusk},
    solana_account::Account,
    solana_instruction::{AccountMeta, Instruction},
    solana_program_error::ProgramError,
    solana_pubkey::Pubkey,
    solana_rent::Rent,
    solana_system_interface::instruction as system_instruction,
    spl_record::{error::RecordError, id, instruction, state::RecordData},
};

fn initialize_instructions(
    payer: &Pubkey,
    authority: &Pubkey,
    account: &Pubkey,
    data: &[u8],
) -> [Instruction; 3] {
    let account_length = std::mem::size_of::<RecordData>()
        .checked_add(data.len())
        .unwrap();
    [
        system_instruction::create_account(
            payer,
            account,
            1.max(Rent::default().minimum_balance(account_length)),
            account_length as u64,
            &id(),
        ),
        instruction::initialize(account, authority),
        instruction::write(account, authority, 0, data),
    ]
}

#[test]
fn initialize_success() {
    let mollusk = Mollusk::new(&id(), "spl_record");

    let payer = Pubkey::new_unique();
    let authority = Pubkey::new_unique();
    let account = Pubkey::new_unique();
    let data = &[111u8; 8];
    let ixs = initialize_instructions(&payer, &authority, &account, data);
    let expected_data = [RecordData::CURRENT_VERSION]
        .into_iter()
        .chain(authority.to_bytes())
        .chain(*data)
        .collect::<Vec<_>>();
    let checks = [
        [Check::success()],
        [Check::success()],
        [Check::account(&account).data(&expected_data).build()],
    ];
    mollusk.process_and_validate_instruction_chain(
        ixs.iter()
            .zip(checks.iter().map(|c| c.as_ref()))
            .collect::<Vec<_>>()
            .as_slice(),
        &[
            (
                payer,
                Account {
                    lamports: 1_000_000_000,
                    ..Default::default()
                },
            ),
            (authority, Account::default()),
            (account, Account::default()),
            mollusk_svm::program::keyed_account_for_system_program(),
        ],
    );
}

#[test]
fn initialize_with_seed_success() {
    let mollusk = Mollusk::new(&id(), "spl_record");

    let payer = Pubkey::new_unique();
    let authority = Pubkey::new_unique();
    let seed = "storage";
    let account = Pubkey::create_with_seed(&authority, seed, &id()).unwrap();
    let data = &[111u8; 8];
    let account_length = std::mem::size_of::<RecordData>()
        .checked_add(data.len())
        .unwrap();
    let ixs = [
        system_instruction::create_account_with_seed(
            &payer,
            &account,
            &authority,
            seed,
            1.max(Rent::default().minimum_balance(account_length)),
            account_length as u64,
            &id(),
        ),
        instruction::initialize(&account, &authority),
        instruction::write(&account, &authority, 0, data),
    ];
    let expected_data = [RecordData::CURRENT_VERSION]
        .into_iter()
        .chain(authority.to_bytes())
        .chain(*data)
        .collect::<Vec<_>>();
    let checks = [
        [Check::success()],
        [Check::success()],
        [Check::account(&account).data(&expected_data).build()],
    ];
    mollusk.process_and_validate_instruction_chain(
        ixs.iter()
            .zip(checks.iter().map(|c| c.as_ref()))
            .collect::<Vec<_>>()
            .as_slice(),
        &[
            (
                payer,
                Account {
                    lamports: 1_000_000_000,
                    ..Default::default()
                },
            ),
            (authority, Account::default()),
            (account, Account::default()),
            mollusk_svm::program::keyed_account_for_system_program(),
        ],
    );
}

#[test]
fn initialize_twice_fail() {
    let mollusk = Mollusk::new(&id(), "spl_record");

    let payer = Pubkey::new_unique();
    let authority = Pubkey::new_unique();
    let account = Pubkey::new_unique();
    let data = &[111u8; 8];
    let mut ixs = initialize_instructions(&payer, &authority, &account, data).to_vec();
    ixs.push(instruction::initialize(&account, &authority));
    let checks = [
        [Check::success()],
        [Check::success()],
        [Check::success()],
        [Check::err(ProgramError::AccountAlreadyInitialized)],
    ];
    mollusk.process_and_validate_instruction_chain(
        ixs.iter()
            .zip(checks.iter().map(|c| c.as_ref()))
            .collect::<Vec<_>>()
            .as_slice(),
        &[
            (
                payer,
                Account {
                    lamports: 1_000_000_000,
                    ..Default::default()
                },
            ),
            (authority, Account::default()),
            (account, Account::default()),
            mollusk_svm::program::keyed_account_for_system_program(),
        ],
    );
}

#[test]
fn write_success() {
    let mollusk = Mollusk::new(&id(), "spl_record");

    let payer = Pubkey::new_unique();
    let authority = Pubkey::new_unique();
    let account = Pubkey::new_unique();
    let data = &[111u8; 8];
    let new_data = &[200u8; 8];
    let mut ixs = initialize_instructions(&payer, &authority, &account, data).to_vec();
    ixs.push(instruction::write(&account, &authority, 0, new_data));
    let expected_data = [RecordData::CURRENT_VERSION]
        .into_iter()
        .chain(authority.to_bytes())
        .chain(*new_data)
        .collect::<Vec<_>>();
    let checks = [
        [Check::success()],
        [Check::success()],
        [Check::success()],
        [Check::account(&account).data(&expected_data).build()],
    ];
    mollusk.process_and_validate_instruction_chain(
        ixs.iter()
            .zip(checks.iter().map(|c| c.as_ref()))
            .collect::<Vec<_>>()
            .as_slice(),
        &[
            (
                payer,
                Account {
                    lamports: 1_000_000_000,
                    ..Default::default()
                },
            ),
            (authority, Account::default()),
            (account, Account::default()),
            mollusk_svm::program::keyed_account_for_system_program(),
        ],
    );
}

#[test]
fn write_fail_wrong_authority() {
    let mollusk = Mollusk::new(&id(), "spl_record");
    let payer = Pubkey::new_unique();
    let authority = Pubkey::new_unique();
    let wrong_authority = Pubkey::new_unique();
    let account = Pubkey::new_unique();
    let data = &[111u8; 8];
    let new_data = &[200u8; 8];
    let mut ixs = initialize_instructions(&payer, &authority, &account, data).to_vec();
    ixs.push(instruction::write(&account, &wrong_authority, 0, new_data));
    let checks = [
        [Check::success()],
        [Check::success()],
        [Check::success()],
        [Check::err(ProgramError::Custom(
            RecordError::IncorrectAuthority as u32,
        ))],
    ];
    mollusk.process_and_validate_instruction_chain(
        ixs.iter()
            .zip(checks.iter().map(|c| c.as_ref()))
            .collect::<Vec<_>>()
            .as_slice(),
        &[
            (
                payer,
                Account {
                    lamports: 1_000_000_000,
                    ..Default::default()
                },
            ),
            (authority, Account::default()),
            (wrong_authority, Account::default()),
            (account, Account::default()),
            mollusk_svm::program::keyed_account_for_system_program(),
        ],
    );
}

#[test]
fn write_fail_unsigned() {
    let mollusk = Mollusk::new(&id(), "spl_record");
    let payer = Pubkey::new_unique();
    let authority = Pubkey::new_unique();
    let account = Pubkey::new_unique();
    let data = &[111u8; 8];
    let mut ixs = initialize_instructions(&payer, &authority, &account, data).to_vec();
    ixs.push(Instruction {
        program_id: id(),
        accounts: vec![
            AccountMeta::new(account, false),
            AccountMeta::new_readonly(authority, false),
        ],
        data: instruction::RecordInstruction::Write { offset: 0, data }.pack(),
    });
    let checks = [
        [Check::success()],
        [Check::success()],
        [Check::success()],
        [Check::err(ProgramError::MissingRequiredSignature)],
    ];
    mollusk.process_and_validate_instruction_chain(
        ixs.iter()
            .zip(checks.iter().map(|c| c.as_ref()))
            .collect::<Vec<_>>()
            .as_slice(),
        &[
            (
                payer,
                Account {
                    lamports: 1_000_000_000,
                    ..Default::default()
                },
            ),
            (authority, Account::default()),
            (account, Account::default()),
            mollusk_svm::program::keyed_account_for_system_program(),
        ],
    );
}

#[test]
fn close_account_success() {
    let mollusk = Mollusk::new(&id(), "spl_record");
    let payer = Pubkey::new_unique();
    let authority = Pubkey::new_unique();
    let recipient = Pubkey::new_unique();
    let account = Pubkey::new_unique();
    let data = &[111u8; 8];
    let account_length = std::mem::size_of::<RecordData>()
        .checked_add(data.len())
        .unwrap();
    let mut ixs = initialize_instructions(&payer, &authority, &account, data).to_vec();
    ixs.push(instruction::close_account(&account, &authority, &recipient));
    let checks = [
        [Check::success()],
        [Check::success()],
        [Check::success()],
        [Check::account(&recipient)
            .lamports(Rent::default().minimum_balance(account_length))
            .build()],
    ];
    mollusk.process_and_validate_instruction_chain(
        ixs.iter()
            .zip(checks.iter().map(|c| c.as_ref()))
            .collect::<Vec<_>>()
            .as_slice(),
        &[
            (
                payer,
                Account {
                    lamports: 1_000_000_000,
                    ..Default::default()
                },
            ),
            (authority, Account::default()),
            (recipient, Account::default()),
            (account, Account::default()),
            mollusk_svm::program::keyed_account_for_system_program(),
        ],
    );
}

#[test]
fn close_account_fail_wrong_authority() {
    let mollusk = Mollusk::new(&id(), "spl_record");
    let payer = Pubkey::new_unique();
    let authority = Pubkey::new_unique();
    let wrong_authority = Pubkey::new_unique();
    let recipient = Pubkey::new_unique();
    let account = Pubkey::new_unique();
    let data = &[111u8; 8];
    let mut ixs = initialize_instructions(&payer, &authority, &account, data).to_vec();
    ixs.push(instruction::close_account(
        &account,
        &wrong_authority,
        &recipient,
    ));
    let checks = [
        [Check::success()],
        [Check::success()],
        [Check::success()],
        [Check::err(ProgramError::Custom(
            RecordError::IncorrectAuthority as u32,
        ))],
    ];
    mollusk.process_and_validate_instruction_chain(
        ixs.iter()
            .zip(checks.iter().map(|c| c.as_ref()))
            .collect::<Vec<_>>()
            .as_slice(),
        &[
            (
                payer,
                Account {
                    lamports: 1_000_000_000,
                    ..Default::default()
                },
            ),
            (authority, Account::default()),
            (wrong_authority, Account::default()),
            (recipient, Account::default()),
            (account, Account::default()),
            mollusk_svm::program::keyed_account_for_system_program(),
        ],
    );
}

#[test]
fn close_account_fail_unsigned() {
    let mollusk = Mollusk::new(&id(), "spl_record");
    let payer = Pubkey::new_unique();
    let authority = Pubkey::new_unique();
    let recipient = Pubkey::new_unique();
    let account = Pubkey::new_unique();
    let data = &[111u8; 8];
    let mut ixs = initialize_instructions(&payer, &authority, &account, data).to_vec();
    ixs.push(Instruction {
        program_id: id(),
        accounts: vec![
            AccountMeta::new(account, false),
            AccountMeta::new_readonly(authority, false),
            AccountMeta::new(recipient, false),
        ],
        data: instruction::RecordInstruction::CloseAccount.pack(),
    });
    let checks = [
        [Check::success()],
        [Check::success()],
        [Check::success()],
        [Check::err(ProgramError::MissingRequiredSignature)],
    ];
    mollusk.process_and_validate_instruction_chain(
        ixs.iter()
            .zip(checks.iter().map(|c| c.as_ref()))
            .collect::<Vec<_>>()
            .as_slice(),
        &[
            (
                payer,
                Account {
                    lamports: 1_000_000_000,
                    ..Default::default()
                },
            ),
            (authority, Account::default()),
            (recipient, Account::default()),
            (account, Account::default()),
            mollusk_svm::program::keyed_account_for_system_program(),
        ],
    );
}

#[test]
fn set_authority_success() {
    let mollusk = Mollusk::new(&id(), "spl_record");

    let payer = Pubkey::new_unique();
    let authority = Pubkey::new_unique();
    let new_authority = Pubkey::new_unique();
    let account = Pubkey::new_unique();
    let data = &[111u8; 8];
    let mut ixs = initialize_instructions(&payer, &authority, &account, data).to_vec();
    ixs.push(instruction::set_authority(
        &account,
        &authority,
        &new_authority,
    ));
    let expected_data = [RecordData::CURRENT_VERSION]
        .into_iter()
        .chain(new_authority.to_bytes())
        .chain(*data)
        .collect::<Vec<_>>();
    let checks = [
        [Check::success()],
        [Check::success()],
        [Check::success()],
        [Check::account(&account).data(&expected_data).build()],
    ];
    mollusk.process_and_validate_instruction_chain(
        ixs.iter()
            .zip(checks.iter().map(|c| c.as_ref()))
            .collect::<Vec<_>>()
            .as_slice(),
        &[
            (
                payer,
                Account {
                    lamports: 1_000_000_000,
                    ..Default::default()
                },
            ),
            (authority, Account::default()),
            (new_authority, Account::default()),
            (account, Account::default()),
            mollusk_svm::program::keyed_account_for_system_program(),
        ],
    );
}

#[test]
fn set_authority_fail_wrong_authority() {
    let mollusk = Mollusk::new(&id(), "spl_record");
    let payer = Pubkey::new_unique();
    let authority = Pubkey::new_unique();
    let wrong_authority = Pubkey::new_unique();
    let new_authority = Pubkey::new_unique();
    let account = Pubkey::new_unique();
    let data = &[111u8; 8];
    let mut ixs = initialize_instructions(&payer, &authority, &account, data).to_vec();
    ixs.push(instruction::set_authority(
        &account,
        &wrong_authority,
        &new_authority,
    ));
    let checks = [
        [Check::success()],
        [Check::success()],
        [Check::success()],
        [Check::err(ProgramError::Custom(
            RecordError::IncorrectAuthority as u32,
        ))],
    ];
    mollusk.process_and_validate_instruction_chain(
        ixs.iter()
            .zip(checks.iter().map(|c| c.as_ref()))
            .collect::<Vec<_>>()
            .as_slice(),
        &[
            (
                payer,
                Account {
                    lamports: 1_000_000_000,
                    ..Default::default()
                },
            ),
            (authority, Account::default()),
            (wrong_authority, Account::default()),
            (new_authority, Account::default()),
            (account, Account::default()),
            mollusk_svm::program::keyed_account_for_system_program(),
        ],
    );
}

#[test]
fn set_authority_fail_unsigned() {
    let mollusk = Mollusk::new(&id(), "spl_record");
    let payer = Pubkey::new_unique();
    let authority = Pubkey::new_unique();
    let new_authority = Pubkey::new_unique();
    let account = Pubkey::new_unique();
    let data = &[111u8; 8];
    let mut ixs = initialize_instructions(&payer, &authority, &account, data).to_vec();
    ixs.push(Instruction {
        program_id: id(),
        accounts: vec![
            AccountMeta::new(account, false),
            AccountMeta::new_readonly(authority, false),
            AccountMeta::new(new_authority, false),
        ],
        data: instruction::RecordInstruction::SetAuthority.pack(),
    });
    let checks = [
        [Check::success()],
        [Check::success()],
        [Check::success()],
        [Check::err(ProgramError::MissingRequiredSignature)],
    ];
    mollusk.process_and_validate_instruction_chain(
        ixs.iter()
            .zip(checks.iter().map(|c| c.as_ref()))
            .collect::<Vec<_>>()
            .as_slice(),
        &[
            (
                payer,
                Account {
                    lamports: 1_000_000_000,
                    ..Default::default()
                },
            ),
            (authority, Account::default()),
            (new_authority, Account::default()),
            (account, Account::default()),
            mollusk_svm::program::keyed_account_for_system_program(),
        ],
    );
}

#[test]
fn reallocate_success() {
    let mollusk = Mollusk::new(&id(), "spl_record");
    let payer = Pubkey::new_unique();
    let authority = Pubkey::new_unique();
    let account = Pubkey::new_unique();
    let data = &[111u8; 8];
    let new_data_length = 16u64;

    let delta_account_data_length = new_data_length.saturating_sub(data.len() as u64);
    let additional_lamports_needed =
        Rent::default().minimum_balance(delta_account_data_length as usize);
    let mut ixs = initialize_instructions(&payer, &authority, &account, data).to_vec();
    ixs.push(instruction::reallocate(
        &account,
        &authority,
        new_data_length,
    ));
    ixs.push(system_instruction::transfer(
        &payer,
        &account,
        additional_lamports_needed,
    ));
    let old_data_length = 8u64;
    ixs.push(instruction::reallocate(
        &account,
        &authority,
        old_data_length,
    ));
    let expanded_data = [RecordData::CURRENT_VERSION]
        .into_iter()
        .chain(authority.to_bytes())
        .chain(*data)
        .chain(vec![0u8; delta_account_data_length as usize])
        .collect::<Vec<_>>();
    let shrunk_data = [RecordData::CURRENT_VERSION]
        .into_iter()
        .chain(authority.to_bytes())
        .chain(*data)
        .chain(vec![0u8; delta_account_data_length as usize])
        .collect::<Vec<_>>();
    let checks = [
        [Check::success()],
        [Check::success()],
        [Check::success()],
        [Check::account(&account).data(&expanded_data).build()],
        [Check::success()],
        [Check::account(&account).data(&shrunk_data).build()],
    ];
    mollusk.process_and_validate_instruction_chain(
        ixs.iter()
            .zip(checks.iter().map(|c| c.as_ref()))
            .collect::<Vec<_>>()
            .as_slice(),
        &[
            (
                payer,
                Account {
                    lamports: 1_000_000_000,
                    ..Default::default()
                },
            ),
            (authority, Account::default()),
            (account, Account::default()),
            mollusk_svm::program::keyed_account_for_system_program(),
        ],
    );
}

#[test]
fn reallocate_fail_wrong_authority() {
    let mollusk = Mollusk::new(&id(), "spl_record");
    let payer = Pubkey::new_unique();
    let authority = Pubkey::new_unique();
    let wrong_authority = Pubkey::new_unique();
    let account = Pubkey::new_unique();
    let data = &[111u8; 8];
    let new_data_length = 16u64;
    let delta_account_data_length = new_data_length.saturating_sub(data.len() as u64);
    let additional_lamports_needed =
        Rent::default().minimum_balance(delta_account_data_length as usize);
    let mut ixs = initialize_instructions(&payer, &authority, &account, data).to_vec();
    ixs.push(system_instruction::transfer(
        &payer,
        &account,
        additional_lamports_needed,
    ));
    ixs.push(instruction::reallocate(
        &account,
        &wrong_authority,
        new_data_length,
    ));
    let checks = [
        [Check::success()],
        [Check::success()],
        [Check::success()],
        [Check::success()],
        [Check::err(ProgramError::Custom(
            RecordError::IncorrectAuthority as u32,
        ))],
    ];
    mollusk.process_and_validate_instruction_chain(
        ixs.iter()
            .zip(checks.iter().map(|c| c.as_ref()))
            .collect::<Vec<_>>()
            .as_slice(),
        &[
            (
                payer,
                Account {
                    lamports: 1_000_000_000,
                    ..Default::default()
                },
            ),
            (authority, Account::default()),
            (wrong_authority, Account::default()),
            (account, Account::default()),
            mollusk_svm::program::keyed_account_for_system_program(),
        ],
    );
}

#[test]
fn reallocate_fail_unsigned() {
    let mollusk = Mollusk::new(&id(), "spl_record");
    let payer = Pubkey::new_unique();
    let authority = Pubkey::new_unique();
    let account = Pubkey::new_unique();
    let data = &[111u8; 8];
    let new_data_length = 16u64;
    let delta_account_data_length = new_data_length.saturating_sub(data.len() as u64);
    let additional_lamports_needed =
        Rent::default().minimum_balance(delta_account_data_length as usize);
    let mut ixs = initialize_instructions(&payer, &authority, &account, data).to_vec();
    ixs.push(system_instruction::transfer(
        &payer,
        &account,
        additional_lamports_needed,
    ));
    ixs.push(Instruction {
        program_id: id(),
        accounts: vec![
            AccountMeta::new(account, false),
            AccountMeta::new(authority, false),
        ],
        data: instruction::RecordInstruction::Reallocate {
            data_length: new_data_length,
        }
        .pack(),
    });
    let checks = [
        [Check::success()],
        [Check::success()],
        [Check::success()],
        [Check::success()],
        [Check::err(ProgramError::MissingRequiredSignature)],
    ];
    mollusk.process_and_validate_instruction_chain(
        ixs.iter()
            .zip(checks.iter().map(|c| c.as_ref()))
            .collect::<Vec<_>>()
            .as_slice(),
        &[
            (
                payer,
                Account {
                    lamports: 1_000_000_000,
                    ..Default::default()
                },
            ),
            (authority, Account::default()),
            (account, Account::default()),
            mollusk_svm::program::keyed_account_for_system_program(),
        ],
    );
}
