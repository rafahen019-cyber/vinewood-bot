// ================== IMPORTAÇÕES ==================
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  Events
} = require("discord.js");
const fs = require("fs");

// ================== CONFIGURAÇÕES ==================
// 🔴 TROQUE TODOS OS IDS ABAIXO

const TOKEN = process.env.TOKEN; // Render

const CANAL_PAINEL = "1460745948308443341"; // onde fica o painel bonito
const CANAL_PENDENTES = "1461141029750308957";
const CANAL_APROVADOS = "1461141105838915594";
const CANAL_REPROVADOS = "1461141065091387574";
const CANAL_LOGS = "1461144931115597824";

const CARGO_APROVADO = "1328774637252776038";

// ================== CLIENT ==================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ]
});

// ================== FUNÇÃO DATA ==================
function agora() {
  return new Date().toLocaleString("pt-BR");
}

// ================== BOT ONLINE ==================
client.once(Events.ClientReady, async () => {
  console.log("✅ Bot Vinewood online");

  // 🔹 CRIA O PAINEL AUTOMATICAMENTE
  const canal = await client.channels.fetch(CANAL_PAINEL);

  const embedPainel = new EmbedBuilder()
    .setColor("#ff0033")
    .setTitle("🛡️ RECRUTAMENTO • VINEWOOD")
    .setDescription(`
▶ **Informações Necessárias**
▫ ID do Personagem  
▫ Nome do Personagem  
▫ Celular do Personagem  
▫ Nome do Recrutador  

⚠ **Importante**
▫ Envie apenas 1 solicitação  
▫ O processo pode levar algum tempo  
▫ Em caso de dúvidas, procure seu recrutador
    `)
    .setFooter({ text: "VINEWOOD • Sistema de Registro" });

  const botao = new ButtonBuilder()
    .setCustomId("abrir_registro")
    .setLabel("REGISTRO")
    .setStyle(ButtonStyle.Success);

  await canal.send({
    embeds: [embedPainel],
    components: [new ActionRowBuilder().addComponents(botao)]
  });
});

// ================== INTERAÇÕES ==================
client.on(Events.InteractionCreate, async interaction => {

  // ========= BOTÃO REGISTRO =========
  if (interaction.isButton() && interaction.customId === "abrir_registro") {

    const registros = JSON.parse(fs.readFileSync("./registros.json"));

    const bloqueado = registros.find(r =>
      r.usuario === interaction.user.id &&
      (r.status === "Pendente" || r.status === "Aprovado")
    );

    if (bloqueado) {
      return interaction.reply({
        content: "❌ Você já possui um registro pendente ou aprovado.",
        ephemeral: true
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("form_registro")
      .setTitle("📋 Registro Vinewood");

    const campos = [
      ["id", "ID do Personagem"],
      ["nome", "Nome do Personagem"],
      ["celular", "Celular do Personagem"],
      ["recrutador", "Nome do Recrutador"]
    ];

    modal.addComponents(
      ...campos.map(c =>
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(c[0])
            .setLabel(c[1])
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      )
    );

    return interaction.showModal(modal);
  }

  // ========= ENVIO DO FORM =========
  if (interaction.isModalSubmit() && interaction.customId === "form_registro") {

    const registros = JSON.parse(fs.readFileSync("./registros.json"));

    const dados = {
      usuario: interaction.user.id,
      nick: interaction.user.tag,
      id_personagem: interaction.fields.getTextInputValue("id"),
      nome_personagem: interaction.fields.getTextInputValue("nome"),
      celular: interaction.fields.getTextInputValue("celular"),
      recrutador: interaction.fields.getTextInputValue("recrutador"),
      status: "Pendente",
      data_envio: agora(),
      data_finalizacao: null
    };

    registros.push(dados);
    fs.writeFileSync("./registros.json", JSON.stringify(registros, null, 2));

    const embedStaff = new EmbedBuilder()
      .setColor("#f1c40f")
      .setTitle("📥 REGISTRO PENDENTE • VINEWOOD")
      .setDescription(`
👤 <@${dados.usuario}>
🆔 ${dados.id_personagem}
📛 ${dados.nome_personagem}
📱 ${dados.celular}
👥 ${dados.recrutador}
🕒 ${dados.data_envio}
      `);

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`acao_${dados.usuario}`)
      .setPlaceholder("Selecionar ação")
      .addOptions([
        { label: "Aprovar", value: "aprovar", emoji: "✅" },
        { label: "Reprovar", value: "reprovar", emoji: "❌" }
      ]);

    await client.channels.cache.get(CANAL_PENDENTES).send({
      embeds: [embedStaff],
      components: [new ActionRowBuilder().addComponents(menu)]
    });

    return interaction.reply({
      content: "✅ Registro enviado com sucesso!",
      ephemeral: true
    });
  }

  // ========= APROVAR / REPROVAR =========
  if (interaction.isStringSelectMenu()) {

    const acao = interaction.values[0];
    const userId = interaction.customId.split("_")[1];
    const staff = interaction.user;

    const registros = JSON.parse(fs.readFileSync("./registros.json"));
    const registro = registros.reverse().find(r => r.usuario === userId);
    if (!registro) return;

    const membro = await interaction.guild.members.fetch(userId);

    registro.status = acao === "aprovar" ? "Aprovado" : "Reprovado";
    registro.data_finalizacao = agora();

    fs.writeFileSync("./registros.json", JSON.stringify(registros, null, 2));

    if (acao === "aprovar") {
      await membro.roles.add(CARGO_APROVADO);
      await membro.send("✅ Seu registro na **VINEWOOD** foi APROVADO!");
    } else {
      await membro.send("❌ Seu registro na **VINEWOOD** foi REPROVADO.");
    }

    const destino = acao === "aprovar" ? CANAL_APROVADOS : CANAL_REPROVADOS;

    await client.channels.cache.get(destino).send({
      embeds: [
        new EmbedBuilder(interaction.message.embeds[0].data)
          .setColor(acao === "aprovar" ? "#2ecc71" : "#e74c3c")
          .setTitle(acao === "aprovar"
            ? "✅ REGISTRO APROVADO"
            : "❌ REGISTRO REPROVADO"
          )
      ]
    });

   });
client.login(process.env.TOKEN);
