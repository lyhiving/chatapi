import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const chatgptEmail = process.env.CHATGPT_EMAIL;
const chatgptPassword = process.env.CHATGPT_PASSWORD;
async function main() {
  await prisma.chatGPTAccount.deleteMany();
  await prisma.chatGPTAccount.create({
    data: {
      email: chatgptEmail,
      password: chatgptPassword,
    },
  });
  console.log('Seed Success!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
