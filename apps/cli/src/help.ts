export const CLI_HELP = `Invoicely CLI

Usage:
  invoicely template list [--json]
  invoicely template show <name> [--json]
  invoicely template save --file <template.json> [--force] [--json]
  invoicely template delete <name> [--json]
  invoicely validate <invoice|input|template> --file <data.json> [--json]
  invoicely record list [--json]
  invoicely record show <id|invoice-number> [--json]
  invoicely record delete <id|invoice-number> [--json]
  invoicely record create --template <name> --input <input.json>
                          [--serial <digits>] [--json]
  invoicely record render <id|invoice-number> --output <invoice.pdf>
                          [--force] [--json]
  invoicely serial peek <template> [--json]
  invoicely serial next <template> [--json]
  invoicely serial set <template> <digits> [--json]
  invoicely generate --template <name> --input <input.json> --output <invoice.pdf>
                     [--serial <digits>] [--force] [--json]

Behavior:
  --json emits stable machine-readable results and errors.
  record create stores a complete private-local invoice and refuses duplicate invoice numbers.
  record create reserves the next serial atomically unless --serial is supplied.
  record render always renders the validated data stored in PostgreSQL.
  generate reserves the template's next serial transactionally unless --serial is supplied.
  output files are never replaced unless --force is supplied.

Exit codes:
  0 success, 2 usage, 3 validation, 4 not found, 5 I/O or runtime failure
`;
