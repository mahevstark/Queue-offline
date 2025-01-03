const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function main() {
  // Check if manager exists
  const existingManager = await prisma.user.findFirst({
    where: {
      role: 'MANAGER'
    }
  })

  if (!existingManager) {
    // Create a branch first
    const branch = await prisma.branch.create({
      data: {
        name: 'My Branch',
        status: 'ACTIVE',
      }
    })

    // Create manager if doesn't exist
    const hashedPassword = await bcrypt.hash('A!P0w3rful&Ungue$$abw0rd!', 10)
    
    await prisma.user.create({
      data: {
        fullName: 'Admin',
        email: 'admin@queuesystem.com', 
        password: hashedPassword,
        role: 'MANAGER',
        status: 'ACTIVE',
        isAvailable: true,
        managedBranch: {
          connect: {
            id: branch.id
          }
        }
      }
    })
    console.log('Manager and branch created successfully')
  } else {
    console.log('Manager already exists')
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