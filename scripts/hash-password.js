// This script turns your password into a "hash" (a locked/scrambled version).
// How to run it:
//   node scripts/hash-password.js YourPassword123
//
// Copy the output and paste it next to ADMIN_PASSWORD_HASH in .env.local

const bcrypt = require('bcryptjs')

const password = process.argv[2]

if (!password) {
  console.log('Password missing. Run it like this:')
  console.log('  node scripts/hash-password.js YourPassword123')
  process.exit(1)
}

const hash = bcrypt.hashSync(password, 10)
// Encoding to base64 because bcrypt hashes contain "$" characters, and
// Next.js .env files treat "$" as "variable expansion" syntax - this
// corrupts the hash. Base64 avoids that problem entirely.
const encoded = Buffer.from(hash).toString('base64')

console.log('\nHere is your hash - paste it next to ADMIN_PASSWORD_HASH in .env.local:\n')
console.log(encoded)
console.log('')
