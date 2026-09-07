/**
 * Zielsprachliche Impulse für die Klasse.
 *
 * Diese Bausteine erscheinen in der Projektion und im Unterrichtsmodus. Sie
 * richten sich nach der **Zielsprache der Sequenz**, nicht nach der
 * Bediensprache der Lehrkraft. Es wird nichts übersetzt oder abgerufen – die
 * Formulierungen sind fest hinterlegt.
 *
 * Für jede auswählbare Zielsprache liegt ein vollständiger Satz vor. Fehlt eine
 * Sprache, greift Französisch als Vorgabe der Beispielsequenz; das wird beim
 * Start geprüft (`missingPromptKeys`).
 */

/** Platzhalter der Form `{name}` werden ersetzt. */
export type PromptParams = Record<string, string>;

const fr = {
  /* Kurze Arbeitsanweisungen */
  'learner.look': 'Regardez.',
  'learner.listen': 'Écoutez.',
  'learner.choose': 'Choisissez.',
  'learner.show': 'Montrez.',
  'learner.compare': 'Comparez.',
  'learner.sort': 'Classez.',
  'learner.complete': 'Complétez.',
  'learner.react': 'Réagissez.',
  'learner.formulate': 'Formulez.',
  'learner.reuse': 'Réutilisez l’expression.',

  /* Impulse einzelner Schritte */
  'step.prompt.impuls': 'Regardez.',
  'step.prompt.vermuten': 'À votre avis, qu’est-ce que cela veut dire ?',
  'step.prompt.audio': 'Écoutez bien.',
  'step.prompt.ccq': 'Répondez brièvement.',
  'step.prompt.hilfen-ausblenden': 'Les aides ont disparu. Qui peut le redire ?',
  'step.prompt.abruf': 'Comment dit-on cela ?',
  'step.prompt.aufgabe': 'Utilisez « {expression} » dans une situation à vous.',

  /* Abrufaufgaben */
  'check.prompt.ausdruck-auswaehlen': 'Quelle expression correspond à « {meaning} » ? Choisissez.',
  'check.prompt.welche-reaktion': 'Quelqu’un dit : « {utterance} ». Quelle réaction convient ?',
  'check.prompt.was-ausgeblendet': 'Qu’est-ce qui était écrit ici ? Dites l’expression pour : {meaning}',
  'check.prompt.situation-zu-ausdruck': '{situation} – comment le dit-on ?',
  'check.prompt.welcher-ausdruck-fehlt': 'Complétez : {gap}',
  'check.prompt.slot-variieren': 'Dans « {frame} », remplacez un élément.',
  'check.prompt.reaktion-formulieren': 'Répondez à : « {utterance} »',
  'check.prompt.einheit-verwenden': 'Utilisez « {expression} » dans cette situation : {situation}',

  /* Fragerahmen für CCQs */
  'ccq.scaffold.welches-bild': 'Quelle image correspond à « {expression} » ?',
  'ccq.scaffold.welche-situation': 'Dans quelle situation dit-on « {expression} » ?',
  'ccq.scaffold.beispiel-nichtbeispiel': 'Est-ce que « {example} » correspond à « {expression} » ? Oui ou non ?',
  'ccq.scaffold.welche-bedeutung': 'Ici, quel sens de « {expression} » ?',
  'ccq.scaffold.sprechhandlung': '« {utterance} » : est-ce une invitation, une information, un accord ou un refus ?',

  /* Freie Fragestämme – die Lehrkraft ergänzt die Lücken */
  'ccq.stem.entweder-oder': 'Est-ce … ou … ?',
  'ccq.stem.jetzt-oder-spaeter': 'Est-ce que ça se passe maintenant ou plus tard ?',
  'ccq.stem.noetig-oder-moeglich': 'Est-ce nécessaire ou seulement possible ?',
  'ccq.stem.nein-sagen': 'Est-ce que la personne peut dire non ?',
  'ccq.stem.positiv-negativ': 'Est-ce positif ou négatif ?',
  'ccq.stem.freunde-oder-formell': 'On dit ça plutôt à des amis ou dans une situation formelle ?',
  'ccq.stem.passt-beispiel': 'Est-ce que cet exemple convient ?',
  'ccq.stem.wer-handelt': 'Qui agit ? Qui parle ?',

  /* Reaktivierung */
  'impulse.prompt.bedeutung-erinnern': 'Que veut dire « {expression} » ?',
  'impulse.prompt.ausdruck-zur-situation': 'Quelle expression convient ici ? {situation}',
  'impulse.prompt.chunk-ergaenzen': 'Complétez : {gap}',
  'impulse.prompt.reaktion-formulieren': 'Répondez à : « {utterance} »',
  'impulse.prompt.neuer-kontext': 'Utilisez « {expression} » dans une nouvelle situation.',
  'impulse.prompt.neuer-kontext-thema': 'Utilisez « {expression} » dans une nouvelle situation : {topic}.',
  /* Wort herauslocken, Kollokation, Wiederholung */
  'step.prompt.wort-elizitieren': 'Comment dit-on cela en français ?',
  'step.prompt.chunk': 'Écoutez l’expression entière.',
  'step.prompt.wiederholung': 'Qu’avons-nous appris ? Redites-le.',

  /* Travail de prononciation */
  'drill.prompt.model': 'Écoutez bien.',
  'drill.prompt.chorus': 'Tous ensemble.',
  'drill.prompt.groups': 'Cette rangée, s’il vous plaît.',
  'drill.prompt.individual': 'Une personne, s’il vous plaît.',
  'drill.prompt.listen': 'Encore une fois, doucement.',
};

export type PromptKey = keyof typeof fr;

const en: Record<PromptKey, string> = {
  'learner.look': 'Look.',
  'learner.listen': 'Listen.',
  'learner.choose': 'Choose.',
  'learner.show': 'Point to it.',
  'learner.compare': 'Compare.',
  'learner.sort': 'Sort them.',
  'learner.complete': 'Complete it.',
  'learner.react': 'Respond.',
  'learner.formulate': 'Say it.',
  'learner.reuse': 'Use the expression again.',

  'step.prompt.impuls': 'Look.',
  'step.prompt.vermuten': 'What could this mean?',
  'step.prompt.audio': 'Listen carefully.',
  'step.prompt.ccq': 'Answer briefly.',
  'step.prompt.hilfen-ausblenden': 'The prompts are gone. Who can still say it?',
  'step.prompt.abruf': 'How do you say this?',
  'step.prompt.aufgabe': 'Use “{expression}” in a situation of your own.',

  'check.prompt.ausdruck-auswaehlen': 'Which expression matches “{meaning}”? Choose one.',
  'check.prompt.welche-reaktion': 'Someone says: “{utterance}”. Which response fits?',
  'check.prompt.was-ausgeblendet': 'What was written here? Say the expression for: {meaning}',
  'check.prompt.situation-zu-ausdruck': '{situation} – how do you say it?',
  'check.prompt.welcher-ausdruck-fehlt': 'Complete it: {gap}',
  'check.prompt.slot-variieren': 'In “{frame}”, replace one part.',
  'check.prompt.reaktion-formulieren': 'Respond to: “{utterance}”',
  'check.prompt.einheit-verwenden': 'Use “{expression}” in this situation: {situation}',

  'ccq.scaffold.welches-bild': 'Which picture matches “{expression}”?',
  'ccq.scaffold.welche-situation': 'In which situation do you say “{expression}”?',
  'ccq.scaffold.beispiel-nichtbeispiel': 'Does “{example}” match “{expression}”? Yes or no?',
  'ccq.scaffold.welche-bedeutung': 'Which meaning of “{expression}” is meant here?',
  'ccq.scaffold.sprechhandlung': '“{utterance}”: is this an invitation, information, agreement or refusal?',

  'ccq.stem.entweder-oder': 'Is it … or …?',
  'ccq.stem.jetzt-oder-spaeter': 'Does this happen now or later?',
  'ccq.stem.noetig-oder-moeglich': 'Is it necessary or only possible?',
  'ccq.stem.nein-sagen': 'Can the person say no?',
  'ccq.stem.positiv-negativ': 'Is it positive or negative?',
  'ccq.stem.freunde-oder-formell': 'Do you say this to friends or in a formal situation?',
  'ccq.stem.passt-beispiel': 'Does this example fit?',
  'ccq.stem.wer-handelt': 'Who is doing it? Who is speaking?',

  'impulse.prompt.bedeutung-erinnern': 'What does “{expression}” mean?',
  'impulse.prompt.ausdruck-zur-situation': 'Which expression fits here? {situation}',
  'impulse.prompt.chunk-ergaenzen': 'Complete it: {gap}',
  'impulse.prompt.reaktion-formulieren': 'Respond to: “{utterance}”',
  'impulse.prompt.neuer-kontext': 'Use “{expression}” in a new situation.',
  'impulse.prompt.neuer-kontext-thema': 'Use “{expression}” in a new situation: {topic}.',
  'step.prompt.wort-elizitieren': 'How do we say this in English?',
  'step.prompt.chunk': 'Listen to the whole phrase.',
  'step.prompt.wiederholung': 'What did we learn? Say it again.',

  'drill.prompt.model': 'Listen carefully.',
  'drill.prompt.chorus': 'All together.',
  'drill.prompt.groups': 'This row, please.',
  'drill.prompt.individual': 'One person, please.',
  'drill.prompt.listen': 'Once more, slowly.',
};

const es: Record<PromptKey, string> = {
  'learner.look': 'Mirad.',
  'learner.listen': 'Escuchad.',
  'learner.choose': 'Elegid.',
  'learner.show': 'Señalad.',
  'learner.compare': 'Comparad.',
  'learner.sort': 'Clasificad.',
  'learner.complete': 'Completad.',
  'learner.react': 'Responded.',
  'learner.formulate': 'Formulad.',
  'learner.reuse': 'Usad otra vez la expresión.',

  'step.prompt.impuls': 'Mirad.',
  'step.prompt.vermuten': '¿Qué puede significar esto?',
  'step.prompt.audio': 'Escuchad con atención.',
  'step.prompt.ccq': 'Responded brevemente.',
  'step.prompt.hilfen-ausblenden': 'Las ayudas han desaparecido. ¿Quién sabe decirlo?',
  'step.prompt.abruf': '¿Cómo se dice esto?',
  'step.prompt.aufgabe': 'Usad «{expression}» en una situación vuestra.',

  'check.prompt.ausdruck-auswaehlen': '¿Qué expresión corresponde a «{meaning}»? Elegid una.',
  'check.prompt.welche-reaktion': 'Alguien dice: «{utterance}». ¿Qué respuesta encaja?',
  'check.prompt.was-ausgeblendet': '¿Qué ponía aquí? Decid la expresión para: {meaning}',
  'check.prompt.situation-zu-ausdruck': '{situation} – ¿cómo se dice?',
  'check.prompt.welcher-ausdruck-fehlt': 'Completad: {gap}',
  'check.prompt.slot-variieren': 'En «{frame}», cambiad un elemento.',
  'check.prompt.reaktion-formulieren': 'Responded a: «{utterance}»',
  'check.prompt.einheit-verwenden': 'Usad «{expression}» en esta situación: {situation}',

  'ccq.scaffold.welches-bild': '¿Qué imagen corresponde a «{expression}»?',
  'ccq.scaffold.welche-situation': '¿En qué situación se dice «{expression}»?',
  'ccq.scaffold.beispiel-nichtbeispiel': '¿«{example}» corresponde a «{expression}»? ¿Sí o no?',
  'ccq.scaffold.welche-bedeutung': '¿Qué significado de «{expression}» se usa aquí?',
  'ccq.scaffold.sprechhandlung': '«{utterance}»: ¿es una invitación, una información, una aceptación o un rechazo?',

  'ccq.stem.entweder-oder': '¿Es … o …?',
  'ccq.stem.jetzt-oder-spaeter': '¿Ocurre ahora o más tarde?',
  'ccq.stem.noetig-oder-moeglich': '¿Es necesario o solo posible?',
  'ccq.stem.nein-sagen': '¿Puede la persona decir que no?',
  'ccq.stem.positiv-negativ': '¿Es positivo o negativo?',
  'ccq.stem.freunde-oder-formell': '¿Se dice a los amigos o en una situación formal?',
  'ccq.stem.passt-beispiel': '¿Encaja este ejemplo?',
  'ccq.stem.wer-handelt': '¿Quién actúa? ¿Quién habla?',

  'impulse.prompt.bedeutung-erinnern': '¿Qué significa «{expression}»?',
  'impulse.prompt.ausdruck-zur-situation': '¿Qué expresión encaja aquí? {situation}',
  'impulse.prompt.chunk-ergaenzen': 'Completad: {gap}',
  'impulse.prompt.reaktion-formulieren': 'Responded a: «{utterance}»',
  'impulse.prompt.neuer-kontext': 'Usad «{expression}» en una situación nueva.',
  'impulse.prompt.neuer-kontext-thema': 'Usad «{expression}» en una situación nueva: {topic}.',
  'step.prompt.wort-elizitieren': '¿Cómo se dice esto en español?',
  'step.prompt.chunk': 'Escuchad la expresión entera.',
  'step.prompt.wiederholung': '¿Qué hemos aprendido? Decidlo otra vez.',

  'drill.prompt.model': 'Escuchad bien.',
  'drill.prompt.chorus': 'Todos juntos.',
  'drill.prompt.groups': 'Esta fila, por favor.',
  'drill.prompt.individual': 'Una persona, por favor.',
  'drill.prompt.listen': 'Otra vez, despacio.',
};

const it: Record<PromptKey, string> = {
  'learner.look': 'Guardate.',
  'learner.listen': 'Ascoltate.',
  'learner.choose': 'Scegliete.',
  'learner.show': 'Indicate.',
  'learner.compare': 'Confrontate.',
  'learner.sort': 'Ordinate.',
  'learner.complete': 'Completate.',
  'learner.react': 'Rispondete.',
  'learner.formulate': 'Formulate.',
  'learner.reuse': 'Riutilizzate l’espressione.',

  'step.prompt.impuls': 'Guardate.',
  'step.prompt.vermuten': 'Che cosa può significare?',
  'step.prompt.audio': 'Ascoltate bene.',
  'step.prompt.ccq': 'Rispondete brevemente.',
  'step.prompt.hilfen-ausblenden': 'Gli aiuti sono spariti. Chi sa ancora dirlo?',
  'step.prompt.abruf': 'Come si dice?',
  'step.prompt.aufgabe': 'Usate «{expression}» in una situazione vostra.',

  'check.prompt.ausdruck-auswaehlen': 'Quale espressione corrisponde a «{meaning}»? Scegliete.',
  'check.prompt.welche-reaktion': 'Qualcuno dice: «{utterance}». Quale risposta va bene?',
  'check.prompt.was-ausgeblendet': 'Che cosa c’era scritto qui? Dite l’espressione per: {meaning}',
  'check.prompt.situation-zu-ausdruck': '{situation} – come si dice?',
  'check.prompt.welcher-ausdruck-fehlt': 'Completate: {gap}',
  'check.prompt.slot-variieren': 'In «{frame}», sostituite un elemento.',
  'check.prompt.reaktion-formulieren': 'Rispondete a: «{utterance}»',
  'check.prompt.einheit-verwenden': 'Usate «{expression}» in questa situazione: {situation}',

  'ccq.scaffold.welches-bild': 'Quale immagine corrisponde a «{expression}»?',
  'ccq.scaffold.welche-situation': 'In quale situazione si dice «{expression}»?',
  'ccq.scaffold.beispiel-nichtbeispiel': '«{example}» corrisponde a «{expression}»? Sì o no?',
  'ccq.scaffold.welche-bedeutung': 'Qui quale significato di «{expression}»?',
  'ccq.scaffold.sprechhandlung': '«{utterance}»: è un invito, un’informazione, un accordo o un rifiuto?',

  'ccq.stem.entweder-oder': 'È … o …?',
  'ccq.stem.jetzt-oder-spaeter': 'Succede adesso o più tardi?',
  'ccq.stem.noetig-oder-moeglich': 'È necessario o soltanto possibile?',
  'ccq.stem.nein-sagen': 'La persona può dire di no?',
  'ccq.stem.positiv-negativ': 'È positivo o negativo?',
  'ccq.stem.freunde-oder-formell': 'Si dice agli amici o in una situazione formale?',
  'ccq.stem.passt-beispiel': 'Questo esempio va bene?',
  'ccq.stem.wer-handelt': 'Chi agisce? Chi parla?',

  'impulse.prompt.bedeutung-erinnern': 'Che cosa significa «{expression}»?',
  'impulse.prompt.ausdruck-zur-situation': 'Quale espressione va bene qui? {situation}',
  'impulse.prompt.chunk-ergaenzen': 'Completate: {gap}',
  'impulse.prompt.reaktion-formulieren': 'Rispondete a: «{utterance}»',
  'impulse.prompt.neuer-kontext': 'Usate «{expression}» in una nuova situazione.',
  'impulse.prompt.neuer-kontext-thema': 'Usate «{expression}» in una nuova situazione: {topic}.',
  'step.prompt.wort-elizitieren': 'Come si dice in italiano?',
  'step.prompt.chunk': 'Ascoltate l’espressione intera.',
  'step.prompt.wiederholung': 'Che cosa abbiamo imparato? Ripetetelo.',

  'drill.prompt.model': 'Ascoltate bene.',
  'drill.prompt.chorus': 'Tutti insieme.',
  'drill.prompt.groups': 'Questa fila, per favore.',
  'drill.prompt.individual': 'Una persona, per favore.',
  'drill.prompt.listen': 'Ancora una volta, piano.',
};

const ru: Record<PromptKey, string> = {
  'learner.look': 'Смотрите.',
  'learner.listen': 'Слушайте.',
  'learner.choose': 'Выберите.',
  'learner.show': 'Покажите.',
  'learner.compare': 'Сравните.',
  'learner.sort': 'Распределите.',
  'learner.complete': 'Дополните.',
  'learner.react': 'Ответьте.',
  'learner.formulate': 'Скажите.',
  'learner.reuse': 'Используйте выражение ещё раз.',

  'step.prompt.impuls': 'Смотрите.',
  'step.prompt.vermuten': 'Что это может значить?',
  'step.prompt.audio': 'Слушайте внимательно.',
  'step.prompt.ccq': 'Ответьте коротко.',
  'step.prompt.hilfen-ausblenden': 'Подсказок больше нет. Кто скажет?',
  'step.prompt.abruf': 'Как это сказать?',
  'step.prompt.aufgabe': 'Используйте «{expression}» в своей ситуации.',

  'check.prompt.ausdruck-auswaehlen': 'Какое выражение подходит к «{meaning}»? Выберите.',
  'check.prompt.welche-reaktion': 'Кто-то говорит: «{utterance}». Какой ответ подходит?',
  'check.prompt.was-ausgeblendet': 'Что здесь было? Назовите выражение к: {meaning}',
  'check.prompt.situation-zu-ausdruck': '{situation} – как это сказать?',
  'check.prompt.welcher-ausdruck-fehlt': 'Дополните: {gap}',
  'check.prompt.slot-variieren': 'В «{frame}» замените одну часть.',
  'check.prompt.reaktion-formulieren': 'Ответьте на: «{utterance}»',
  'check.prompt.einheit-verwenden': 'Используйте «{expression}» в этой ситуации: {situation}',

  'ccq.scaffold.welches-bild': 'Какая картинка подходит к «{expression}»?',
  'ccq.scaffold.welche-situation': 'В какой ситуации говорят «{expression}»?',
  'ccq.scaffold.beispiel-nichtbeispiel': '«{example}» подходит к «{expression}»? Да или нет?',
  'ccq.scaffold.welche-bedeutung': 'Какое значение «{expression}» здесь?',
  'ccq.scaffold.sprechhandlung': '«{utterance}»: это приглашение, информация, согласие или отказ?',

  'ccq.stem.entweder-oder': 'Это … или …?',
  'ccq.stem.jetzt-oder-spaeter': 'Это сейчас или позже?',
  'ccq.stem.noetig-oder-moeglich': 'Это необходимо или только возможно?',
  'ccq.stem.nein-sagen': 'Может ли человек сказать нет?',
  'ccq.stem.positiv-negativ': 'Это положительно или отрицательно?',
  'ccq.stem.freunde-oder-formell': 'Так говорят друзьям или в официальной ситуации?',
  'ccq.stem.passt-beispiel': 'Этот пример подходит?',
  'ccq.stem.wer-handelt': 'Кто действует? Кто говорит?',

  'impulse.prompt.bedeutung-erinnern': 'Что значит «{expression}»?',
  'impulse.prompt.ausdruck-zur-situation': 'Какое выражение подходит здесь? {situation}',
  'impulse.prompt.chunk-ergaenzen': 'Дополните: {gap}',
  'impulse.prompt.reaktion-formulieren': 'Ответьте на: «{utterance}»',
  'impulse.prompt.neuer-kontext': 'Используйте «{expression}» в новой ситуации.',
  'impulse.prompt.neuer-kontext-thema': 'Используйте «{expression}» в новой ситуации: {topic}.',
  'step.prompt.wort-elizitieren': 'Как это будет по-русски?',
  'step.prompt.chunk': 'Послушайте выражение целиком.',
  'step.prompt.wiederholung': 'Что мы выучили? Скажите ещё раз.',

  'drill.prompt.model': 'Слушайте внимательно.',
  'drill.prompt.chorus': 'Все вместе.',
  'drill.prompt.groups': 'Этот ряд, пожалуйста.',
  'drill.prompt.individual': 'Один человек, пожалуйста.',
  'drill.prompt.listen': 'Ещё раз, медленно.',
};

const la: Record<PromptKey, string> = {
  'learner.look': 'Spectate.',
  'learner.listen': 'Audite.',
  'learner.choose': 'Eligite.',
  'learner.show': 'Monstrate.',
  'learner.compare': 'Comparate.',
  'learner.sort': 'Disponite.',
  'learner.complete': 'Complete.',
  'learner.react': 'Respondete.',
  'learner.formulate': 'Dicite.',
  'learner.reuse': 'Locutione iterum utimini.',

  'step.prompt.impuls': 'Spectate.',
  'step.prompt.vermuten': 'Quid significare potest?',
  'step.prompt.audio': 'Audite diligenter.',
  'step.prompt.ccq': 'Breviter respondete.',
  'step.prompt.hilfen-ausblenden': 'Auxilia absunt. Quis adhuc dicere potest?',
  'step.prompt.abruf': 'Quomodo hoc dicitur?',
  'step.prompt.aufgabe': 'Utimini «{expression}» in situ vestro.',

  'check.prompt.ausdruck-auswaehlen': 'Quae locutio ad «{meaning}» pertinet? Eligite.',
  'check.prompt.welche-reaktion': 'Aliquis dicit: «{utterance}». Quae responsio convenit?',
  'check.prompt.was-ausgeblendet': 'Quid hic scriptum erat? Dicite locutionem ad: {meaning}',
  'check.prompt.situation-zu-ausdruck': '{situation} – quomodo dicitur?',
  'check.prompt.welcher-ausdruck-fehlt': 'Complete: {gap}',
  'check.prompt.slot-variieren': 'In «{frame}» partem mutate.',
  'check.prompt.reaktion-formulieren': 'Respondete ad: «{utterance}»',
  'check.prompt.einheit-verwenden': 'Utimini «{expression}» in hoc situ: {situation}',

  'ccq.scaffold.welches-bild': 'Quae imago ad «{expression}» pertinet?',
  'ccq.scaffold.welche-situation': 'Quo in situ dicitur «{expression}»?',
  'ccq.scaffold.beispiel-nichtbeispiel': 'Estne «{example}» exemplum «{expression}»? Ita an non?',
  'ccq.scaffold.welche-bedeutung': 'Quae significatio «{expression}» hic valet?',
  'ccq.scaffold.sprechhandlung': '«{utterance}»: estne invitatio, nuntius, consensus an recusatio?',

  'ccq.stem.entweder-oder': 'Estne … an …?',
  'ccq.stem.jetzt-oder-spaeter': 'Fitne nunc an postea?',
  'ccq.stem.noetig-oder-moeglich': 'Estne necessarium an tantum possibile?',
  'ccq.stem.nein-sagen': 'Potestne persona negare?',
  'ccq.stem.positiv-negativ': 'Estne bonum an malum?',
  'ccq.stem.freunde-oder-formell': 'Diciturne amicis an in re publica?',
  'ccq.stem.passt-beispiel': 'Convenitne hoc exemplum?',
  'ccq.stem.wer-handelt': 'Quis agit? Quis loquitur?',

  'impulse.prompt.bedeutung-erinnern': 'Quid significat «{expression}»?',
  'impulse.prompt.ausdruck-zur-situation': 'Quae locutio hic convenit? {situation}',
  'impulse.prompt.chunk-ergaenzen': 'Complete: {gap}',
  'impulse.prompt.reaktion-formulieren': 'Respondete ad: «{utterance}»',
  'impulse.prompt.neuer-kontext': 'Utimini «{expression}» in novo situ.',
  'impulse.prompt.neuer-kontext-thema': 'Utimini «{expression}» in novo situ: {topic}.',
  'step.prompt.wort-elizitieren': 'Quomodo hoc Latine dicitur?',
  'step.prompt.chunk': 'Locutionem totam audite.',
  'step.prompt.wiederholung': 'Quid didicimus? Iterum dicite.',

  'drill.prompt.model': 'Audite diligenter.',
  'drill.prompt.chorus': 'Omnes simul.',
  'drill.prompt.groups': 'Hic ordo, quaeso.',
  'drill.prompt.individual': 'Unus, quaeso.',
  'drill.prompt.listen': 'Iterum, lente.',
};

export const PROMPTS: Record<string, Record<PromptKey, string>> = { fr, en, es, it, ru, la };

const FALLBACK_LANGUAGE = 'fr';

function interpolate(template: string, params?: PromptParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => params[name] ?? match).replace(/\s+/g, ' ').trim();
}

/**
 * Zielsprachlicher Baustein. Unbekannte Zielsprachen fallen auf Französisch
 * zurück; unbekannte Schlüssel liefern eine leere Zeichenkette, damit im
 * Unterricht nie eine rohe Kennung auf der Wand steht.
 */
export function promptFor(language: string, key: string, params?: PromptParams): string {
  const table = PROMPTS[language] ?? PROMPTS[FALLBACK_LANGUAGE];
  const value = table[key as PromptKey] ?? PROMPTS[FALLBACK_LANGUAGE][key as PromptKey];
  return value ? interpolate(value, params) : '';
}

/** Prüft, ob eine Zielsprache alle Bausteine mitbringt (für Tests). */
export function missingPromptKeys(language: string): string[] {
  const table = PROMPTS[language];
  if (!table) return Object.keys(fr);
  return Object.keys(fr).filter((key) => !table[key as PromptKey]?.trim());
}
