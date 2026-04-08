import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Scale from "@/models/Scale";
import Roteiro from "@/models/Roteiro";
import Notification from "@/models/Notification";
import TaskProgress from "@/models/TaskProgress";
import Comment from "@/models/Comment";

// POST /api/seed — criar dados completos de teste
export async function POST() {
  try {
    await connectDB();

    // Limpar tudo
    await Promise.all([
      User.deleteMany({}),
      Scale.deleteMany({}),
      Roteiro.deleteMany({}),
      Notification.deleteMany({}),
      TaskProgress.deleteMany({}),
      Comment.deleteMany({}),
    ]);

    // --- 1. Usuarios ---
    const adminPw = await bcrypt.hash("admin123", 10);
    const memberPw = await bcrypt.hash("123456", 10);

    const admin = await User.create({
      name: "Admin",
      username: "admin",
      password: adminPw,
      role: "admin",
      skills: [],
    });

    const usersData = [
      { name: "Nay", username: "nay", role: "coordenador", skills: ["editor"] },
      { name: "Sarah", username: "sarah", role: "roteirista", skills: [] },
      { name: "Cris", username: "cris", role: "roteirista", skills: [] },
      { name: "Mel", username: "mel", role: "roteirista", skills: [] },
      { name: "Bruna", username: "bruna", role: "membro", skills: ["editor"] },
      { name: "Laura", username: "laura", role: "membro", skills: ["editor"] },
      { name: "Paula", username: "paula", role: "membro", skills: ["editor"] },
      { name: "Lari", username: "lari", role: "membro", skills: ["editor", "narrador"] },
      { name: "Thays", username: "thays", role: "membro", skills: ["narrador"] },
      { name: "Thais", username: "thais", role: "membro", skills: ["narrador"] },
    ];

    const createdUsers = await User.insertMany(
      usersData.map((u) => ({
        ...u,
        password: memberPw,
        managedBy: u.role !== "coordenador" ? admin._id : undefined,
      }))
    );

    // Mapa de username -> _id
    const userMap: Record<string, typeof admin._id> = { admin: admin._id };
    for (const u of createdUsers) {
      userMap[u.username] = u._id;
    }

    // --- 2. Escalas ---
    const scaleMarcoDB = await Scale.create({
      title: "Escala Marco",
      month: "2026-03",
      createdBy: admin._id,
      weeks: [
        {
          number: 1,
          theme: "Jesus esta vivo!",
          deadline: new Date("2026-03-07"),
          status: "concluido",
          assignments: {
            roteiristas: [userMap.sarah, userMap.cris],
            editores: [userMap.bruna, userMap.laura, userMap.paula],
            narradores: [userMap.lari, userMap.thays, userMap.thais],
          },
        },
        {
          number: 2,
          theme: "Cafe da Manha na Praia",
          deadline: new Date("2026-03-14"),
          status: "concluido",
          assignments: {
            roteiristas: [userMap.sarah, userMap.cris],
            editores: [userMap.bruna, userMap.laura, userMap.paula],
            narradores: [userMap.lari, userMap.thays, userMap.thais],
          },
        },
        {
          number: 3,
          theme: "A Grande Comissao",
          deadline: new Date("2026-03-21"),
          status: "revisao",
          assignments: {
            roteiristas: [userMap.sarah, userMap.cris],
            editores: [userMap.bruna, userMap.laura, userMap.paula],
            narradores: [userMap.lari, userMap.thays, userMap.thais],
          },
        },
        {
          number: 4,
          theme: "O Ceu",
          deadline: new Date("2026-03-28"),
          status: "edicao",
          assignments: {
            roteiristas: [userMap.sarah, userMap.cris],
            editores: [userMap.bruna, userMap.laura, userMap.paula],
            narradores: [userMap.lari, userMap.thays, userMap.thais],
          },
        },
      ],
    });

    const scaleAbrilDB = await Scale.create({
      title: "Escala Abril",
      month: "2026-04",
      createdBy: admin._id,
      weeks: [
        {
          number: 1,
          theme: "Pascoa - Jesus esta vivo!",
          deadline: new Date("2026-04-04"),
          status: "concluido",
          assignments: {
            roteiristas: [userMap.sarah, userMap.cris],
            editores: [userMap.bruna, userMap.laura, userMap.paula],
            narradores: [userMap.lari, userMap.thays, userMap.thais],
          },
        },
        {
          number: 2,
          theme: "Cafe da Manha na Praia",
          deadline: new Date("2026-04-11"),
          status: "gravacao",
          assignments: {
            roteiristas: [userMap.sarah, userMap.cris],
            editores: [userMap.bruna, userMap.laura, userMap.paula],
            narradores: [userMap.lari, userMap.thays, userMap.thais],
          },
        },
        {
          number: 3,
          theme: "A Grande Comissao",
          deadline: new Date("2026-04-18"),
          status: "roteiro",
          assignments: {
            roteiristas: [userMap.sarah, userMap.cris],
            editores: [userMap.bruna, userMap.laura, userMap.paula],
            narradores: [userMap.lari, userMap.thays, userMap.thais],
          },
        },
        {
          number: 4,
          theme: "O Ceu",
          deadline: new Date("2026-04-25"),
          status: "roteiro",
          assignments: {
            roteiristas: [userMap.sarah, userMap.cris],
            editores: [userMap.bruna, userMap.laura, userMap.paula],
            narradores: [userMap.lari, userMap.thays, userMap.thais],
          },
        },
      ],
    });

    // --- 3. Roteiros ---
    const roteiro1 = await Roteiro.create({
      title: "Jesus esta vivo! - Roteiro Semana 1",
      content:
        "<h2>Jesus esta vivo!</h2>" +
        "<p><strong>Texto base:</strong> Mateus 28:1-10</p>" +
        "<p>No primeiro dia da semana, ao amanhecer, Maria Madalena e a outra Maria " +
        "foram ver o sepulcro. E eis que houvera um grande terremoto, porque um anjo " +
        "do Senhor desceu do ceu e, chegando, removeu a pedra e sentou-se sobre ela.</p>" +
        "<p><em>Narracao:</em> Contar com alegria e entusiasmo a ressurreicao de Cristo.</p>",
      scaleId: scaleMarcoDB._id,
      weekNumber: 1,
      createdBy: userMap.sarah,
      assignedEditors: [userMap.bruna, userMap.laura],
      assignedNarrators: [userMap.lari, userMap.thays],
    });

    const roteiro2 = await Roteiro.create({
      title: "Cafe da Manha na Praia - Roteiro Semana 2",
      content:
        "<h2>Cafe da Manha na Praia</h2>" +
        "<p><strong>Texto base:</strong> Joao 21:1-14</p>" +
        "<p>Depois disso, Jesus tornou a manifestar-se aos discipulos junto ao mar " +
        "de Tiberias. Simao Pedro disse: Vou pescar. Disseram-lhe: Nos tambem vamos " +
        "contigo. Lancaram a rede e nao podiam puxa-la pela grande quantidade de peixes.</p>" +
        "<p><em>Narracao:</em> Jesus cuida de nos ate nos detalhes do dia a dia.</p>",
      scaleId: scaleMarcoDB._id,
      weekNumber: 2,
      createdBy: userMap.cris,
      assignedEditors: [userMap.paula, userMap.laura],
      assignedNarrators: [userMap.thais, userMap.lari],
    });

    const roteiro3 = await Roteiro.create({
      title: "A Grande Comissao - Roteiro Semana 3",
      content:
        "<h2>A Grande Comissao</h2>" +
        "<p><strong>Texto base:</strong> Mateus 28:18-20</p>" +
        "<p>Jesus, aproximando-se, falou-lhes, dizendo: Toda autoridade me foi dada " +
        "no ceu e na terra. Ide, portanto, fazei discipulos de todas as nacoes.</p>" +
        "<p><em>Narracao:</em> O chamado de Jesus para cada um de nos.</p>",
      scaleId: scaleMarcoDB._id,
      weekNumber: 3,
      createdBy: userMap.sarah,
      assignedEditors: [userMap.bruna, userMap.paula],
      assignedNarrators: [userMap.thays, userMap.thais],
    });

    const roteiro4 = await Roteiro.create({
      title: "Pascoa - Jesus esta vivo! - Roteiro Abril Semana 1",
      content:
        "<h2>Pascoa - Jesus esta vivo!</h2>" +
        "<p><strong>Texto base:</strong> Lucas 24:1-12</p>" +
        "<p>No primeiro dia da semana, muito cedo, as mulheres foram ao sepulcro, " +
        "levando os aromas que haviam preparado. Encontraram a pedra removida, " +
        "mas ao entrar, nao acharam o corpo do Senhor Jesus.</p>" +
        "<p><em>Narracao:</em> A esperanca da Pascoa: Cristo ressuscitou!</p>",
      scaleId: scaleAbrilDB._id,
      weekNumber: 1,
      createdBy: userMap.cris,
      assignedEditors: [userMap.bruna, userMap.laura, userMap.paula],
      assignedNarrators: [userMap.lari, userMap.thays],
    });

    const roteiro5 = await Roteiro.create({
      title: "Cafe da Manha na Praia - Roteiro Abril Semana 2",
      fileUrl: "https://drive.google.com/file/d/example-roteiro-abril-s2/view",
      scaleId: scaleAbrilDB._id,
      weekNumber: 2,
      createdBy: userMap.sarah,
      assignedEditors: [userMap.laura, userMap.paula],
      assignedNarrators: [userMap.thais, userMap.lari],
    });

    // Vincular roteiros nas semanas das escalas
    scaleMarcoDB.weeks[0].roteiro = roteiro1._id;
    scaleMarcoDB.weeks[1].roteiro = roteiro2._id;
    scaleMarcoDB.weeks[2].roteiro = roteiro3._id;
    await scaleMarcoDB.save();

    scaleAbrilDB.weeks[0].roteiro = roteiro4._id;
    scaleAbrilDB.weeks[1].roteiro = roteiro5._id;
    await scaleAbrilDB.save();

    // --- 4. TaskProgress (semanas concluidas) ---
    const taskProgressEntries = [
      // Escala Marco - Semana 1 (concluido) - todos completaram
      { scaleId: scaleMarcoDB._id, weekNumber: 1, userId: userMap.sarah, role: "roteirista" as const, completed: true, completedAt: new Date("2026-03-03"), notes: "Roteiro finalizado" },
      { scaleId: scaleMarcoDB._id, weekNumber: 1, userId: userMap.cris, role: "roteirista" as const, completed: true, completedAt: new Date("2026-03-03") },
      { scaleId: scaleMarcoDB._id, weekNumber: 1, userId: userMap.bruna, role: "editor" as const, completed: true, completedAt: new Date("2026-03-05"), linkUrl: "https://drive.google.com/file/d/video-s1-bruna/view" },
      { scaleId: scaleMarcoDB._id, weekNumber: 1, userId: userMap.laura, role: "editor" as const, completed: true, completedAt: new Date("2026-03-05"), linkUrl: "https://drive.google.com/file/d/video-s1-laura/view" },
      { scaleId: scaleMarcoDB._id, weekNumber: 1, userId: userMap.lari, role: "narrador" as const, completed: true, completedAt: new Date("2026-03-04"), linkUrl: "https://drive.google.com/file/d/audio-s1-lari/view" },
      { scaleId: scaleMarcoDB._id, weekNumber: 1, userId: userMap.thays, role: "narrador" as const, completed: true, completedAt: new Date("2026-03-04") },

      // Escala Marco - Semana 2 (concluido) - todos completaram
      { scaleId: scaleMarcoDB._id, weekNumber: 2, userId: userMap.sarah, role: "roteirista" as const, completed: true, completedAt: new Date("2026-03-10") },
      { scaleId: scaleMarcoDB._id, weekNumber: 2, userId: userMap.cris, role: "roteirista" as const, completed: true, completedAt: new Date("2026-03-10"), notes: "Revisao feita junto com Sarah" },
      { scaleId: scaleMarcoDB._id, weekNumber: 2, userId: userMap.paula, role: "editor" as const, completed: true, completedAt: new Date("2026-03-12"), linkUrl: "https://drive.google.com/file/d/video-s2-paula/view" },
      { scaleId: scaleMarcoDB._id, weekNumber: 2, userId: userMap.laura, role: "editor" as const, completed: true, completedAt: new Date("2026-03-12") },
      { scaleId: scaleMarcoDB._id, weekNumber: 2, userId: userMap.thais, role: "narrador" as const, completed: true, completedAt: new Date("2026-03-11") },
      { scaleId: scaleMarcoDB._id, weekNumber: 2, userId: userMap.lari, role: "narrador" as const, completed: true, completedAt: new Date("2026-03-11") },

      // Escala Marco - Semana 3 (revisao) - roteiristas e narradores concluidos, editores em progresso
      { scaleId: scaleMarcoDB._id, weekNumber: 3, userId: userMap.sarah, role: "roteirista" as const, completed: true, completedAt: new Date("2026-03-17") },
      { scaleId: scaleMarcoDB._id, weekNumber: 3, userId: userMap.cris, role: "roteirista" as const, completed: true, completedAt: new Date("2026-03-17") },
      { scaleId: scaleMarcoDB._id, weekNumber: 3, userId: userMap.thays, role: "narrador" as const, completed: true, completedAt: new Date("2026-03-19") },
      { scaleId: scaleMarcoDB._id, weekNumber: 3, userId: userMap.thais, role: "narrador" as const, completed: true, completedAt: new Date("2026-03-19") },
      { scaleId: scaleMarcoDB._id, weekNumber: 3, userId: userMap.bruna, role: "editor" as const, completed: true, completedAt: new Date("2026-03-20"), linkUrl: "https://drive.google.com/file/d/video-s3-bruna/view" },
      { scaleId: scaleMarcoDB._id, weekNumber: 3, userId: userMap.paula, role: "editor" as const, completed: false },

      // Escala Marco - Semana 4 (edicao) - roteiristas concluidos, editores em andamento
      { scaleId: scaleMarcoDB._id, weekNumber: 4, userId: userMap.sarah, role: "roteirista" as const, completed: true, completedAt: new Date("2026-03-24") },
      { scaleId: scaleMarcoDB._id, weekNumber: 4, userId: userMap.cris, role: "roteirista" as const, completed: true, completedAt: new Date("2026-03-24") },
      { scaleId: scaleMarcoDB._id, weekNumber: 4, userId: userMap.bruna, role: "editor" as const, completed: false },
      { scaleId: scaleMarcoDB._id, weekNumber: 4, userId: userMap.laura, role: "editor" as const, completed: false },

      // Escala Abril - Semana 1 (concluido) - todos completaram
      { scaleId: scaleAbrilDB._id, weekNumber: 1, userId: userMap.cris, role: "roteirista" as const, completed: true, completedAt: new Date("2026-03-31") },
      { scaleId: scaleAbrilDB._id, weekNumber: 1, userId: userMap.sarah, role: "roteirista" as const, completed: true, completedAt: new Date("2026-03-31") },
      { scaleId: scaleAbrilDB._id, weekNumber: 1, userId: userMap.bruna, role: "editor" as const, completed: true, completedAt: new Date("2026-04-02"), linkUrl: "https://drive.google.com/file/d/video-abril-s1-bruna/view" },
      { scaleId: scaleAbrilDB._id, weekNumber: 1, userId: userMap.laura, role: "editor" as const, completed: true, completedAt: new Date("2026-04-02") },
      { scaleId: scaleAbrilDB._id, weekNumber: 1, userId: userMap.paula, role: "editor" as const, completed: true, completedAt: new Date("2026-04-02") },
      { scaleId: scaleAbrilDB._id, weekNumber: 1, userId: userMap.lari, role: "narrador" as const, completed: true, completedAt: new Date("2026-04-01") },
      { scaleId: scaleAbrilDB._id, weekNumber: 1, userId: userMap.thays, role: "narrador" as const, completed: true, completedAt: new Date("2026-04-01") },

      // Escala Abril - Semana 2 (gravacao) - roteiristas concluidos, narradores em progresso
      { scaleId: scaleAbrilDB._id, weekNumber: 2, userId: userMap.sarah, role: "roteirista" as const, completed: true, completedAt: new Date("2026-04-07") },
      { scaleId: scaleAbrilDB._id, weekNumber: 2, userId: userMap.cris, role: "roteirista" as const, completed: true, completedAt: new Date("2026-04-07") },
      { scaleId: scaleAbrilDB._id, weekNumber: 2, userId: userMap.thais, role: "narrador" as const, completed: false },
      { scaleId: scaleAbrilDB._id, weekNumber: 2, userId: userMap.lari, role: "narrador" as const, completed: false },
    ];

    await TaskProgress.insertMany(taskProgressEntries);

    // --- 5. Notifications (para admin) ---
    const notifications = [
      {
        userId: admin._id,
        message: "Voce foi escalado para Semana 2 - Cafe da Manha na Praia",
        type: "escala" as const,
        read: false,
        link: `/escalas/${scaleAbrilDB._id}`,
      },
      {
        userId: admin._id,
        message: "Roteiro da Semana 1 foi finalizado",
        type: "roteiro" as const,
        read: true,
        link: `/escalas/${scaleMarcoDB._id}`,
      },
      {
        userId: admin._id,
        message: "Gravacoes da Semana 2 concluidas",
        type: "status" as const,
        read: true,
        link: `/escalas/${scaleMarcoDB._id}`,
      },
      {
        userId: admin._id,
        message: "Edicao da Semana 3 concluida — aguardando revisao",
        type: "revisao" as const,
        read: false,
        link: `/escalas/${scaleMarcoDB._id}`,
      },
      {
        userId: admin._id,
        message: "Video Semana 1 aprovado!",
        type: "geral" as const,
        read: false,
        link: `/escalas/${scaleMarcoDB._id}`,
      },
    ];

    await Notification.insertMany(notifications);

    // --- 6. Comments ---
    await Comment.insertMany([
      { scaleId: scaleMarcoDB._id, weekNumber: 3, userId: admin._id, message: "O video ficou muito bom! So ajustar o audio no minuto 2:30.", stage: "revisao" },
      { scaleId: scaleMarcoDB._id, weekNumber: 3, userId: userMap.nay, message: "Concordo, o audio precisa de ajuste. Bruna pode corrigir?", stage: "revisao" },
      { scaleId: scaleMarcoDB._id, weekNumber: 4, userId: userMap.sarah, message: "Roteiro finalizado, podem comecar a gravacao!", stage: "roteiro" },
      { scaleId: scaleAbrilDB._id, weekNumber: 2, userId: userMap.lari, message: "Gravei minha parte, audio anexado.", stage: "gravacao" },
      { scaleId: scaleAbrilDB._id, weekNumber: 2, userId: userMap.thays, message: "Tambem ja gravei! Ficou otimo.", stage: "gravacao" },
      { scaleId: scaleAbrilDB._id, weekNumber: 3, userId: userMap.cris, message: "Comecando a escrever o roteiro dessa semana.", stage: "roteiro" },
    ]);

    return NextResponse.json({
      message: "Seed completo criado com sucesso!",
      data: {
        users: 11,
        scales: 2,
        roteiros: 5,
        taskProgress: taskProgressEntries.length,
        notifications: notifications.length,
        comments: 6,
      },
      logins: {
        admin: { username: "admin", password: "admin123" },
        outros: "Todos com senha 123456 (nay, sarah, cris, mel, bruna, laura, paula, lari, thays, thais)",
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Erro ao criar seed", details: String(error) },
      { status: 500 }
    );
  }
}
