const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const WILD_MAGIC_TABLE = [
  { range: '01–02', effect: 'Tira en esta tabla al comienzo de todos tus turnos durante 1 minuto, ignorando este resultado en las siguientes tiradas.' },
  { range: '03–04', effect: 'Durante el próximo minuto, puedes ver cualquier criatura invisible si tienes línea de visión hacia ella.' },
  { range: '05–06', effect: 'Un modron elegido y controlado por el DM aparece en un espacio desocupado a 5 pies de ti, luego desaparece 1 minuto después.' },
  { range: '07–08', effect: 'Lanzas *bola de fuego* como conjuro de nivel 3 centrado en ti mismo.' },
  { range: '09–10', effect: 'Lanzas *proyectil mágico* como conjuro de nivel 5.' },
  { range: '11–12', effect: 'Lanza 1d10. Tu altura cambia un número de pulgadas igual al resultado. Si el resultado es impar, encoges. Si es par, creces.' },
  { range: '13–14', effect: 'Lanzas *confusión* centrada en ti mismo.' },
  { range: '15–16', effect: 'Durante el próximo minuto, recuperas 5 puntos de golpe al comienzo de cada uno de tus turnos.' },
  { range: '17–18', effect: 'Te crece una larga barba de plumas que permanece hasta que estornudas, momento en el que las plumas explotan desde tu cara.' },
  { range: '19–20', effect: 'Lanzas *grasa* centrada en ti mismo.' },
  { range: '21–22', effect: 'Las criaturas tienen desventaja en las tiradas de salvación contra el próximo conjuro que lances en el próximo minuto.' },
  { range: '23–24', effect: 'Tu piel se vuelve de un vibrante tono azul. Un conjuro de *levantar maldición* puede acabar con este efecto.' },
  { range: '25–26', effect: 'Un ojo aparece en tu frente durante el próximo minuto. Durante ese tiempo, tienes ventaja en las pruebas de Sabiduría (Percepción) que dependan de la vista.' },
  { range: '27–28', effect: 'Durante el próximo minuto, todos tus conjuros con un tiempo de lanzamiento de 1 acción tienen un tiempo de lanzamiento de 1 acción adicional.' },
  { range: '29–30', effect: 'Te teletransportas hasta 60 pies a un espacio desocupado de tu elección que puedas ver.' },
  { range: '31–32', effect: 'Eres transportado al Plano Astral hasta el final de tu próximo turno; después regresas al espacio que ocupabas anteriormente o al espacio desocupado más cercano.' },
  { range: '33–34', effect: 'Maximiza el daño del próximo conjuro de daño que lances en el próximo minuto.' },
  { range: '35–36', effect: 'Lanza 1d10. Tu edad cambia un número de años igual al resultado. Si el resultado es impar, te rejuveneces (mínimo 1 año). Si es par, envejeces.' },
  { range: '37–38', effect: '1d6 flumphs controlados por el DM aparecen en espacios desocupados dentro de 60 pies de ti y están asustados de ti. Desaparecen después de 1 minuto.' },
  { range: '39–40', effect: 'Recuperas 2d10 puntos de golpe.' },
  { range: '41–42', effect: 'Te conviertes en una planta en maceta hasta el comienzo de tu próximo turno. Mientras eres una planta, estás incapacitado y tienes vulnerabilidad a todo el daño. Si caes a 0 puntos de golpe, tu maceta se rompe y tu forma revierte.' },
  { range: '43–44', effect: 'Durante el próximo minuto, puedes teletransportarte hasta 20 pies como acción adicional en cada uno de tus turnos.' },
  { range: '45–46', effect: 'Lanzas *levitar* en ti mismo.' },
  { range: '47–48', effect: 'Un unicornio controlado por el DM aparece en un espacio a 5 pies de ti, luego desaparece 1 minuto después.' },
  { range: '49–50', effect: 'No puedes hablar durante el próximo minuto. Cuando intentas hablar, brotan burbujas rosas de tu boca.' },
  { range: '51–52', effect: 'Un escudo espectral flota cerca de ti durante el próximo minuto, otorgándote un bonificador de +2 a la CA e inmunidad a *proyectil mágico*.' },
  { range: '53–54', effect: 'Eres inmune a los efectos del alcohol durante los próximos 5d6 días.' },
  { range: '55–56', effect: 'Tu cabello cae pero vuelve a crecer en 24 horas.' },
  { range: '57–58', effect: 'Durante el próximo minuto, cualquier objeto inflamable que toques que no esté siendo llevado por otra criatura arde en llamas.' },
  { range: '59–60', effect: 'Recuperas tu ranura de conjuro gastada de nivel más bajo.' },
  { range: '61–62', effect: 'Durante el próximo minuto, debes gritar cuando hablas.' },
  { range: '63–64', effect: 'Lanzas *nube de niebla* centrada en ti mismo.' },
  { range: '65–66', effect: 'Hasta tres criaturas de tu elección a 30 pies de ti reciben 4d10 de daño por relámpago.' },
  { range: '67–68', effect: 'Estás asustado de la criatura más cercana hasta el final de tu próximo turno.' },
  { range: '69–70', effect: 'Cada criatura a 30 pies de ti se vuelve invisible durante el próximo minuto. La invisibilidad termina en una criatura cuando ataca o lanza un conjuro.' },
  { range: '71–72', effect: 'Ganas resistencia a todo el daño durante el próximo minuto.' },
  { range: '73–74', effect: 'Una criatura aleatoria a 60 pies de ti queda envenenada durante 1d4 horas.' },
  { range: '75–76', effect: 'Brillas con luz brillante en un radio de 30 pies durante el próximo minuto. Cualquier criatura que termine su turno a 5 pies de ti queda cegada hasta el final de su próximo turno.' },
  { range: '77–78', effect: 'Lanzas *polimorfar* en ti mismo. Si fallas la tirada de salvación, te conviertes en una oveja durante la duración del conjuro.' },
  { range: '79–80', effect: 'Mariposas ilusorias y pétalos de flores flotan en el aire a 10 pies de ti durante el próximo minuto.' },
  { range: '81–82', effect: 'Puedes tomar una acción adicional de inmediato.' },
  { range: '83–84', effect: 'Cada criatura a 30 pies de ti recibe 1d10 de daño necrótico. Recuperas puntos de golpe iguales a la suma del daño necrótico infligido.' },
  { range: '85–86', effect: 'Lanzas *imagen múltiple*.' },
  { range: '87–88', effect: 'Lanzas *volar* en una criatura aleatoria a 60 pies de ti.' },
  { range: '89–90', effect: 'Te vuelves invisible durante el próximo minuto. Durante ese tiempo, otras criaturas no pueden oírte. La invisibilidad termina si atacas o lanzas un conjuro.' },
  { range: '91–92', effect: 'Si mueres en el próximo minuto, inmediatamente vuelves a la vida como si fuera por el conjuro *reencarnación*.' },
  { range: '93–94', effect: 'Tu tamaño aumenta una categoría durante el próximo minuto.' },
  { range: '95–96', effect: 'Tú y todas las criaturas a 30 pies de ti ganáis vulnerabilidad al daño perforante durante el próximo minuto.' },
  { range: '97–98', effect: 'Estás rodeado de tenue música etérea durante el próximo minuto.' },
  { range: '99–00', effect: 'Recuperas todos los puntos de hechicería gastados.' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wildmagic')
    .setDescription('Tira en la tabla de Oleada de Magia Salvaje (d100)'),

  async execute(interaction) {
    const roll = Math.floor(Math.random() * 100) + 1;
    const entry = WILD_MAGIC_TABLE[Math.floor((roll - 1) / 2)];
    const displayRoll = roll === 100 ? '00' : String(roll).padStart(2, '0');

    const embed = new EmbedBuilder()
      .setTitle('Wild Magic Surge')
      .setColor(0x9B59B6)
      .addFields(
        { name: '🎲 Resultado', value: `**${displayRoll}** (rango ${entry.range})`, inline: true },
      )
      .setDescription(`${entry.effect}`)
      .setFooter({ text: 'Tabla de Oleada de Magia Salvaje • SRD 5e' });

    return interaction.editReply({ embeds: [embed] });
  },
};
