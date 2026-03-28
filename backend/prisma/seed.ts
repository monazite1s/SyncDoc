import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);

    const user = await prisma.user.upsert({
        where: { email: 'test@example.com' },
        update: {},
        create: {
            email: 'test@example.com',
            username: 'testuser',
            password: hashedPassword,
            nickname: 'Test User',
            status: 'ACTIVE',
        },
    });

    console.log('Created user:', user);

    // Create sample document
    const document = await prisma.document.upsert({
        where: { id: 'sample-doc-1' },
        update: {},
        create: {
            id: 'sample-doc-1',
            title: 'Welcome to Collab Editor',
            description: 'This is a sample document to get you started.',
            // content 使用 Bytes 类型，初始文档为空
            // 前端编辑器打开后会通过 Hocuspocus 自动写入 Yjs 二进制状态
            content: null,
            isPublic: false,
            status: 'DRAFT',
            authorId: user.id,
        },
    });

    console.log('Created document:', document);

    // Create collaborator relation
    const collaborator = await prisma.documentCollaborator.upsert({
        where: {
            id: 'sample-collab-1',
        },
        update: {},
        create: {
            id: 'sample-collab-1',
            documentId: document.id,
            userId: user.id,
            role: 'OWNER',
        },
    });

    console.log('Created collaborator:', collaborator);

    console.log('Seeding completed!');
}

main()
    .catch((e) => {
        console.error('Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
