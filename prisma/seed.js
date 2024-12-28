const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function main() {
  // Check if superadmin exists
  const existingSuperAdmin = await prisma.user.findFirst({
    where: {
      role: 'SUPERADMIN'
    }
  })

  if (!existingSuperAdmin) {
    // Create superadmin if doesn't exist
    const hashedPassword = await bcrypt.hash('@dmin@super321', 10) // Change this password
    
    await prisma.user.create({
      data: {
        fullName: 'Super Admin',
        email: 'superadmin@gmail.com', 
        password: hashedPassword,
        role: 'SUPERADMIN',
        status: 'ACTIVE',
        isAvailable: true
      }
    })
    
    console.log('Superadmin created successfully')
  } else {
    console.log('Superadmin already exists')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })