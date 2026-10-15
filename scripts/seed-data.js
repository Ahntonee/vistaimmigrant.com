// Seed copy. Everything here is editable from the dashboard. Legal-topic copy is general information and
// should be reviewed by the attorney before launch (see DECISIONS.md).
const ul = (a) => '<ul>' + a.map((x) => `<li>${x}</li>`).join('') + '</ul>';
const p = (...a) => a.map((x) => `<p>${x}</p>`).join('');
const NOTE = 'Rules, forms, fees and processing times change. Please confirm current requirements before you file anything.';

const services = [
  {
    slug: 'asylum-applications', title: 'Asylum Applications', category: 'legal',
    summary: 'Protection for people in the United States who fear serious harm if they return home.',
    body: p('Asylum is a form of protection for people who are already in the United States and who fear persecution in their home country because of race, religion, nationality, political opinion, or membership in a particular social group.', 'Asylum can be requested in two ways. An <strong>affirmative</strong> application is filed with USCIS (Form I-589) by someone who is not in removal proceedings. A <strong>defensive</strong> application is made to an immigration judge by someone who is already in court. Many people are expected to file within one year of arriving, with some exceptions, so it is wise to speak with an attorney as early as you can.', 'Our licensed attorney can represent you for asylum matters she accepts. Vista staff can help you organize your documents and understand the steps, but they do not give legal advice.'),
    who_for: ul(['People in the U.S. who fear returning to their home country', 'People who have received a Notice to Appear and want to raise asylum in court', 'Families who want to understand how a spouse or child may be included']),
    what_to_expect: p('You meet privately with our team, then with the attorney, who reviews your situation and explains your options. If she accepts your matter, she helps prepare the application and your written statement, gathers evidence, and represents you at the interview or hearing.', 'The process can take a long time and the outcome is decided by USCIS or the judge. No one can promise a result.'),
    what_to_bring: ul(['Passport, national ID, and any travel documents', 'Your I-94 record or entry papers, if you have them', 'Any notices from USCIS or the immigration court', 'Anything that supports your story: police or medical reports, news articles, photographs, letters']),
    faqs: [['Is there a deadline to apply?', p('In general, asylum must be requested within one year of your last arrival in the United States, but there are exceptions. Do not assume you are too late. Speak with an attorney as soon as possible.')], ['Can I work while my asylum case is pending?', p('Some applicants become eligible to apply for a work permit after a waiting period. Timing depends on your case and current rules, and our attorney can explain where you stand.')]],
  },
  {
    slug: 'work-permits-ead', title: 'Work Permits (EAD)', category: 'legal',
    summary: 'Applications and renewals for an Employment Authorization Document.',
    body: p('An Employment Authorization Document (EAD), often called a work permit, shows that you are allowed to work in the United States. It is requested on Form I-765. Who can apply depends on your immigration situation, for example people with a pending asylum application, a pending green card application, or certain temporary statuses.', 'Applications are reviewed by category, and filing under the wrong category or leaving out supporting documents can cause delays. Renewals should be planned early, because processing takes time and a work permit that expires cannot be used.'),
    who_for: ul(['People with a pending case who may qualify to apply for permission to work', 'People whose current work permit is about to expire', 'People who lost a work permit and need a replacement']),
    what_to_expect: p('We start by looking at your documents and your category. For matters the attorney accepts, she confirms eligibility, prepares the filing, and follows up on notices. Vista staff can help you gather photos, copies and records.'),
    what_to_bring: ul(['Passport and I-94, if available', 'Your current or previous work permit (front and back)', 'Receipt notices for any pending case', 'Two passport-style photos', 'Your Social Security card, if you have one']),
    faqs: [['When should I renew my work permit?', p('USCIS generally accepts renewal requests well before the expiration date, up to about six months ahead. Do not wait until the last minute. ' + NOTE)], ['Can I keep working while a renewal is pending?', p('It depends on your category and the rules in effect. Ask before you rely on it.')]],
  },
  {
    slug: 'green-card-adjustment-of-status', title: 'Green Card / Adjustment of Status', category: 'legal',
    summary: 'Applying for lawful permanent residence while you are in the United States.',
    body: p('Adjustment of status is the process of applying for a green card (lawful permanent residence) without leaving the United States. It is filed on Form I-485. Whether you qualify depends on the basis for your application, such as a family relationship, employment, or a grant of asylum, and on factors like how you entered the country, your history, and whether a visa number is available.', 'Because mistakes can affect more than one application, the choice of strategy matters. Our licensed attorney can review your situation and represent you in matters she accepts.'),
    who_for: ul(['Spouses, parents and children of U.S. citizens', 'Family members of permanent residents with an approved petition', 'People with approved asylum or another qualifying basis']),
    what_to_expect: p('The attorney reviews eligibility, then prepares the application and evidence. You will usually attend a biometrics appointment and may be called to an interview. A medical examination by an authorized doctor is generally part of the process.'),
    what_to_bring: ul(['Passport, birth certificate (with English translation if needed)', 'I-94, visas and any prior immigration filings or notices', 'Marriage certificate and proof of relationship, if family-based', 'Tax returns, proof of income, and police records if you have them']),
    faqs: [['How long does a green card application take?', p('It varies widely by category, location and workload. We will explain what to expect for your case, but we cannot promise a date.')], ['Do I need to leave the country to apply?', p('Many people can apply from inside the United States, but not everyone. Eligibility is individual, so please get advice before traveling or filing.')]],
  },
  {
    slug: 'family-based-immigration', title: 'Family-Based Immigration Matters', category: 'legal',
    summary: 'Petitions and applications to keep families together.',
    body: p('U.S. citizens and permanent residents can ask the government to recognize certain relatives for immigration benefits, starting with Form I-130. Spouses, parents and unmarried children of U.S. citizens are treated differently from other relatives, who may have to wait for a visa number to become available.', 'Family cases often involve more than one form: a petition, proof of a real relationship, an affidavit of support from the sponsor, and then either an adjustment application or consular processing abroad. Our attorney can represent families in matters she accepts.'),
    who_for: ul(['U.S. citizens who want to petition for a spouse, parent, child, or sibling', 'Permanent residents who want to petition for a spouse or child', 'Relatives who need to understand waiting times and next steps']),
    what_to_expect: p('We help you understand which relationship category applies and what evidence is typically needed. The attorney prepares the filing for matters she accepts and follows the case through USCIS or the consulate.'),
    what_to_bring: ul(['Proof of the sponsor’s status: U.S. passport, naturalization certificate, or green card', 'Proof of relationship: marriage certificate, birth certificates', 'Photos, joint documents, and records that show your life together', 'Sponsor’s recent tax returns and proof of income']),
    faqs: [['Can I petition for a sibling or a parent?', p('U.S. citizens can petition for parents and siblings, with different rules and waiting times. Permanent residents have different options. The attorney can explain your category.')]],
  },
  {
    slug: 'removal-proceedings', title: 'Removal Proceedings', category: 'legal',
    summary: 'Representation in immigration court when the government seeks removal.',
    body: p('Removal proceedings begin when the government gives you a Notice to Appear (NTA) and files it with an immigration court. The notice lists the reasons the government says you can be removed from the United States and tells you where and when to appear.', 'It is very important to attend every hearing and keep your address up to date with the court. If you miss a hearing, the judge can order you removed in your absence. You have the right to be represented by an attorney in immigration court, though not at government expense. Our licensed attorney can represent you in matters she accepts.'),
    who_for: ul(['Anyone who received a Notice to Appear', 'Families supporting a loved one in immigration court', 'People unsure whether they have a hearing scheduled']),
    what_to_expect: p('The attorney reviews the NTA and your history, explains the charges and whether any forms of relief might apply, and prepares you for each hearing. Vista staff can help you keep track of dates and organize paperwork.'),
    what_to_bring: ul(['The Notice to Appear and every court notice you have received', 'Passport, ID, I-94 and any immigration papers', 'A list of every address where you have lived', 'Any court or criminal records related to your case']),
    faqs: [['I got a Notice to Appear. What should I do first?', p('Do not ignore it. Write down the hearing date, keep the paper safe, and speak with an attorney quickly. You can also check your case status through the immigration court’s online system.')], ['What if I missed a hearing?', p('Contact an attorney right away. In some situations an order made in your absence can be challenged, but strict deadlines apply.')]],
  },
  {
    slug: 'master-calendar-hearings', title: 'Master Calendar Hearings', category: 'legal',
    summary: 'The short first hearings where the judge sets the course of your case.',
    body: p('A master calendar hearing is usually the first appearance in immigration court. Many people have hearings on the same day and each one is short. The judge confirms who you are, explains your rights, asks whether you agree with the allegations and charges in the Notice to Appear, and discusses whether you will ask for any form of relief.', 'What happens here shapes the rest of your case, so it helps to arrive prepared. Our attorney can appear with you for matters she accepts.'),
    who_for: ul(['People with a first or follow-up date on the immigration court calendar', 'People who need an interpreter at court', 'Families who want to know what the day will look like']),
    what_to_expect: p('Arrive early, expect security screening, and wait until your name is called. The judge may set deadlines to file applications or schedule an individual hearing. You can ask the court for an interpreter in advance; the court provides one at no cost.'),
    what_to_bring: ul(['Your hearing notice and the Notice to Appear', 'Government-issued ID', 'Any applications or documents you plan to file', 'A pen and paper to write down dates']),
    faqs: [['How long does a master calendar hearing take?', p('Often only a few minutes in front of the judge, but you may wait much longer for your turn. Plan to spend part of the day.')]],
  },
  {
    slug: 'individual-hearings', title: 'Individual Hearings', category: 'legal',
    summary: 'The full hearing where you present your case to the judge.',
    body: p('An individual hearing, sometimes called a merits hearing, is where you present your case. You may testify, bring witnesses, and submit documents. The government’s attorney can ask questions, and the judge decides whether you qualify for the relief you requested. The decision may be given at the end of the hearing or later in writing.', 'Preparation matters. Evidence and witness lists are often due before the hearing date, and your testimony should be consistent with your written statements. Our attorney can represent you in matters she accepts.'),
    who_for: ul(['People with a hearing date set by the judge', 'People who need to organize evidence and witnesses', 'Families who want to understand the process']),
    what_to_expect: p('We work backward from your hearing date: confirm the filing deadlines, gather and organize evidence, prepare declarations and witnesses, and practice the questions you are likely to be asked. Interpreters are provided by the court for hearings.'),
    what_to_bring: ul(['All documents and evidence related to your application', 'Contact details for witnesses', 'Identification and any court notices', 'Records of any prior filings']),
    faqs: [['Can I bring family members or friends?', p('Immigration court hearings are usually open to the public, but whether someone can testify depends on your case and the judge’s instructions. Ask the attorney before the hearing.')]],
  },
  {
    slug: 'motions-to-reopen', title: 'Motions to Reopen', category: 'legal',
    summary: 'Asking the court to reopen a case after a decision has been made.',
    body: p('A motion to reopen asks the immigration court or the Board of Immigration Appeals to look at a case again after a final decision. It usually must be based on new facts or evidence. In general there are time and number limits, with limited exceptions, for example in some cases where a person did not receive notice of a hearing or where conditions in the home country have changed.', 'Filing a motion does not always stop a removal order from being carried out. Because the deadlines are strict, speak to an attorney as soon as you can. Our attorney can represent you in matters she accepts.'),
    who_for: ul(['People who have a removal order and believe they have new evidence or circumstances', 'People who say they never received notice of a hearing', 'Families trying to understand whether any option remains']),
    what_to_expect: p('The attorney reviews your entire file, tells you honestly whether a motion is realistic, and if she accepts the matter, prepares the motion, evidence and any request to pause removal.'),
    what_to_bring: ul(['Every decision, order and notice you received', 'The documents that show what is new or what changed', 'Proof of your addresses over time']),
    faqs: [['Is there a deadline to file?', p('Yes. There are time limits, and they are different depending on your situation. Do not wait.')]],
  },
  {
    slug: 'immigration-appeals', title: 'Immigration Appeals', category: 'legal',
    summary: 'Appealing an immigration judge’s decision to the Board of Immigration Appeals.',
    body: p('If an immigration judge decides against you, you may be able to appeal to the Board of Immigration Appeals (BIA). The appeal must usually be filed within 30 days of the judge’s decision, so time is short. After the notice of appeal, the parties file written briefs, and the Board reviews the record.', 'In some cases a further appeal to a federal court is possible. Our attorney can represent you in appeals she accepts.'),
    who_for: ul(['People who received a decision from an immigration judge', 'People who believe the judge made a legal or factual error', 'Families who need to understand the next step after a denial']),
    what_to_expect: p('The attorney reviews the judge’s decision and the hearing record, explains the strengths and risks of an appeal, and for matters she accepts files the notice of appeal and brief within the deadlines.'),
    what_to_bring: ul(['The judge’s written decision or order', 'Your Notice to Appear and hearing notices', 'The documents you submitted in court']),
    faqs: [['How long do I have to appeal?', p('Generally 30 days from the judge’s decision. The date counts from the decision, not from when you spoke with a lawyer.')]],
  },
  {
    slug: 'uscis-interviews', title: 'USCIS Interviews', category: 'legal',
    summary: 'Preparing for and attending your interview with a USCIS officer.',
    body: p('Many applications, including family-based green cards, asylum applications and citizenship, include an interview with a USCIS officer. The officer reviews your application, asks questions to confirm the facts, and may ask for more documents.', 'Going in prepared lowers stress and helps avoid avoidable mistakes. Our attorney can accompany you to interviews for matters she accepts. Vista staff can help you gather your documents and plan the day.'),
    who_for: ul(['People who received an interview notice from USCIS', 'Couples applying together', 'People who want to review their application before the interview']),
    what_to_expect: p('Before the interview we review your application and discuss the types of questions asked. On the day, arrive early with your notice and ID. Some interviews allow you to bring an interpreter; ask us what applies to yours.'),
    what_to_bring: ul(['The interview appointment notice', 'Passport and government-issued ID', 'Originals and copies of the documents listed in the notice', 'Anything new since you filed, such as a new address or a change in your family']),
    faqs: [['Can my attorney come with me?', p('Generally yes, if the attorney has filed a notice of representation for your case.')]],
  },
  {
    slug: 'requests-for-evidence-rfe', title: 'Requests for Evidence (RFE)', category: 'legal',
    summary: 'Responding to a USCIS notice asking for more documents.',
    body: p('A Request for Evidence (RFE) means USCIS needs more information before it can decide your case. It is not a denial, but it is serious: the notice lists exactly what is missing and a firm deadline to respond. If you do not respond fully and on time, your application can be denied.', 'A good response answers every item in the notice, in one complete package, with a clear cover letter. Our attorney can review RFEs and respond in matters she accepts, and our team can help you gather and organize what is requested.'),
    who_for: ul(['Anyone who received an RFE or a Notice of Intent to Deny', 'People who are not sure what a notice is asking for']),
    what_to_expect: p('Bring the notice in as soon as you receive it. We read it with you, list each requested item, and plan how to get it. The attorney reviews the final response for matters she accepts.'),
    what_to_bring: ul(['The RFE notice and its envelope', 'A copy of the application you filed', 'Any documents you already have that answer the request']),
    faqs: [['How long do I have to respond?', p('The deadline is printed on your notice and is firm. Start right away.')]],
  },
  {
    slug: 'immigration-document-assistance', title: 'Immigration Document Assistance', category: 'support',
    summary: 'Help gathering, organizing, copying and scanning your paperwork.',
    body: p('Immigration cases involve a lot of paper. Our team can help you collect, organize, copy and scan the documents you already have, make a checklist of what to look for, and keep everything in order for your appointment.', 'This is an administrative support service. <strong>Vista staff are not attorneys and do not give legal advice.</strong> We do not choose forms for you, tell you which benefit to apply for, or advise you about your case. When you need legal advice, we will connect you with a licensed attorney.'),
    who_for: ul(['Anyone getting ready for an appointment with an attorney, USCIS, or the court', 'Families who need help keeping documents in order']),
    what_to_expect: p('We sit down with you, review what you have, create a simple folder system, make clean copies and scans, and flag items that the attorney or the agency may ask to see.'),
    what_to_bring: ul(['Every immigration paper you have, even if you are not sure it matters', 'Identity documents and civil records', 'Letters and notices from any government agency']),
    faqs: [['Can you fill out my immigration forms?', p('Our staff can help with administrative tasks such as copying and organizing, but they cannot select forms or advise you on your case. A licensed attorney handles legal filings for matters she accepts.')]],
  },
  {
    slug: 'translation-services', title: 'Translation Services', category: 'support',
    summary: 'Written translation of documents into English.',
    body: p('Documents in another language usually must be submitted with a complete English translation and a signed statement from the translator that they are competent to translate and that the translation is accurate. We can help with documents such as birth certificates, marriage certificates, school records and police clearances.', 'Tell us the language when you contact us. Translation is a language service, not legal advice.'),
    who_for: ul(['People submitting foreign-language documents to USCIS, the court, or another agency', 'Families who need records translated for schools, banks or employers']),
    what_to_expect: p('You bring the original or a clear copy. We confirm the language and the turnaround time, and return a full English translation with the translator’s certification.'),
    what_to_bring: ul(['The document to be translated (original or a clear copy)', 'The exact spelling of names as they appear in your passport', 'The deadline, if you have one']),
    faqs: [['Do you translate my language?', p('Ask us. If we cannot translate a language ourselves, we will tell you honestly.')]],
  },
  {
    slug: 'interpreter-services', title: 'Interpreter Services', category: 'support',
    summary: 'Spoken interpretation so you can be understood at your appointment.',
    body: p('Understanding what is said, and being understood, matters in every meeting about your case. Our interpreters help you communicate during appointments at our office and can help you prepare for other meetings.', 'An interpreter conveys what is said; they do not give legal advice or opinions about your case. For hearings in immigration court, the court provides an interpreter at no cost, and you should ask for one in advance.'),
    who_for: ul(['People who are more comfortable speaking a language other than English', 'Families who need help at meetings with the attorney or our team']),
    what_to_expect: p('Tell us your language when you schedule. We will arrange an interpreter for your appointment whenever we can, and confirm it with you before the day.'),
    what_to_bring: ul(['Your appointment details', 'Any documents you want to discuss', 'A list of questions you would like to ask']),
    faqs: [['Will the court give me an interpreter?', p('Yes. Immigration court provides an interpreter at no cost for hearings. Make sure the court knows which language you speak.')]],
  },
];

const homeFaqs = [
  ['Is Vista a law firm?', p('No. Vista Immigrant Support Inc. is not a law firm and our non-attorney staff do not give legal advice. Legal advice and representation are provided by licensed attorneys for the matters they accept.')],
  ['Do I need an appointment?', p('Yes. Our office is open Monday through Saturday, 9:00 AM–5:00 PM, by appointment only. You can book online or call us.')],
  ['What language can I speak with you?', p('Tell us your language when you call or book. We will do our best to arrange an interpreter for your visit.')],
  ['What should I bring to my first appointment?', p('Bring any immigration papers you have, a photo ID, and notices from USCIS or the court. If you are unsure, bring everything and we will help you sort through it.')],
];

const categories = [['Guides', 'guides'], ['Court & hearings', 'court-hearings'], ['Documents', 'documents']];

const posts = [
  {
    slug: 'what-happens-at-a-master-calendar-hearing', title: 'What happens at a master calendar hearing', meta_title: 'Master calendar hearing: what to expect', cat: 'court-hearings', tags: ['immigration court', 'hearings'],
    excerpt: 'A plain-language look at the first hearing in immigration court, what the judge will ask, and how to prepare.',
    body: p('If you received a Notice to Appear, your first date in immigration court will probably be a <strong>master calendar hearing</strong>. It can feel intimidating, but knowing what to expect makes it easier.') +
      '<h2>What it is</h2>' + p('A master calendar hearing is a short, preliminary hearing. Many people are scheduled on the same day, and the judge moves through the cases one by one. It is not the hearing where you tell your whole story. That usually comes later.') +
      '<h2>What the judge will do</h2>' + ul(['Confirm your name, address and the language you speak', 'Explain your rights, including the right to be represented by an attorney at your own expense', 'Ask whether you agree with the statements in the Notice to Appear (called allegations) and the legal charges', 'Ask what form of relief you may want to request, if any', 'Set deadlines and schedule the next hearing']) +
      '<h2>How to prepare</h2>' + ul(['Read your hearing notice carefully and write down the date, time and courtroom.', 'Arrive early. Expect security screening like at an airport.', 'Bring photo ID, the Notice to Appear and every paper you have received from immigration authorities.', 'Tell the court which language you speak so an interpreter is available. Interpretation in court is provided at no cost.', 'Keep your address current with the court. Missing a hearing can lead to an order of removal in your absence.']) +
      '<h2>Should you bring an attorney?</h2>' + p('You have the right to be represented, and many people find it helps. Our licensed attorney can represent clients in matters she accepts. If you have a hearing coming up, call us as early as you can so there is time to prepare.') +
      p('<em>This article is general information, not legal advice about your situation.</em>'),
  },
  {
    slug: 'work-permits-ead-the-basics', title: 'Work permits (EAD): the basics', meta_title: 'Work permits (EAD): the basics', cat: 'guides', tags: ['work permit', 'EAD'],
    excerpt: 'What an Employment Authorization Document is, who can apply, and why renewing early matters.',
    body: p('An <strong>Employment Authorization Document (EAD)</strong>, often called a work permit, is a card issued by USCIS that shows you are allowed to work in the United States. You apply for it on Form I-765.') +
      '<h2>Who can apply?</h2>' + p('Eligibility depends on your immigration situation. People in several different situations may be able to apply, for example people with a pending asylum application, a pending green card application, or certain temporary protections. A work permit is requested under a specific category, so the right category matters.') +
      '<h2>Common mistakes</h2>' + ul(['Applying under the wrong category', 'Missing supporting documents or photos', 'Waiting until the card is about to expire to renew', 'Moving and not updating your address with USCIS']) +
      '<h2>Plan your renewal</h2>' + p('Processing times change and can be long. USCIS generally lets you request a renewal well before the expiration date, so mark the date on your calendar early. Whether you can keep working while a renewal is pending depends on your category and the rules at the time.') +
      '<h2>Getting help</h2>' + p('Our team can help you gather documents, photos and copies. For advice about which category applies to you, our licensed attorney can speak with you about matters she accepts.') +
      p('<em>General information only. This is not legal advice.</em>'),
  },
  {
    slug: 'what-to-bring-to-a-uscis-interview', title: 'What to bring to a USCIS interview', meta_title: 'What to bring to a USCIS interview', cat: 'guides', tags: ['USCIS', 'interview'],
    excerpt: 'A practical checklist for interview day, so you walk in prepared and calm.',
    body: p('Receiving an interview notice from USCIS can be stressful. A little preparation goes a long way. Here is a practical checklist to help you get ready.') +
      '<h2>Always bring</h2>' + ul(['The interview notice (the appointment letter)', 'Government-issued photo ID, such as a passport or driver’s license', 'Your green card, work permit, or other immigration documents, if you have them', 'Originals and copies of everything the notice asks you to bring']) +
      '<h2>For family-based cases</h2>' + ul(['Marriage certificate and birth certificates', 'Evidence of your life together: lease or mortgage, bills, bank statements, photographs', 'Sponsor’s latest tax return and proof of income']) +
      '<h2>Before you go</h2>' + ul(['Read through your application again. The officer may ask about anything on it.', 'Make sure your answers match the documents.', 'If your address, job, or family has changed since you filed, bring proof.', 'Plan to arrive early, and plan the route and parking in advance.']) +
      '<h2>On the day</h2>' + p('Answer honestly and clearly. If you do not understand a question, ask the officer to repeat it. If you need an interpreter, ask us whether your type of interview allows you to bring your own.') +
      p('Our team can help you organize your documents before your interview, and our licensed attorney can accompany clients to interviews for matters she accepts.') +
      p('<em>This article is general information and is not legal advice.</em>'),
  },
  {
    slug: 'what-is-a-request-for-evidence-rfe', title: 'What is a Request for Evidence (RFE) and what to do next', meta_title: 'What is an RFE? How to respond', cat: 'documents', tags: ['RFE', 'USCIS'],
    excerpt: 'An RFE is not a denial, but the deadline is firm. Here is how to respond the right way.',
    body: p('A <strong>Request for Evidence (RFE)</strong> is a letter from USCIS saying it needs more information before it can make a decision on your application or petition.') +
      '<h2>It is not a denial</h2>' + p('Receiving an RFE does not mean you were denied. It means something is missing or unclear. But it needs your attention right away.') +
      '<h2>Read it carefully</h2>' + ul(['Find the response deadline printed on the notice. It is firm.', 'Underline every item USCIS lists.', 'Check the return address or instructions for where to send the response.']) +
      '<h2>Build a complete response</h2>' + ul(['Answer every item in the notice, even if you think it is repeated elsewhere.', 'Include the original RFE notice as the top page of your response package.', 'Send copies unless the notice asks for originals.', 'Include certified English translations of any foreign-language documents.', 'Keep a copy of everything you send, and use a mailing method with tracking.']) +
      '<h2>Do not wait</h2>' + p('Gathering documents such as civil records or tax transcripts can take time. Start immediately. Bring the notice to us as soon as it arrives and we will help you list what is requested and gather it. For legal review of your response, our licensed attorney can help with matters she accepts.') +
      p('<em>General information only, not legal advice.</em>'),
  },
  {
    slug: 'how-interpreters-and-translators-help-at-your-appointment', title: 'How interpreters and translators help at your appointment', meta_title: 'Interpreters vs. translators at your visit', cat: 'guides', tags: ['interpreter', 'translation'],
    excerpt: 'The difference between interpreting and translating, and how to get the language help you need.',
    body: p('People often use the words <em>interpreter</em> and <em>translator</em> as if they mean the same thing. They do not, and knowing the difference can help you get the right support.') +
      '<h2>Interpreting is spoken</h2>' + p('An interpreter helps people who speak different languages understand each other in conversation, for example during an appointment. A good interpreter conveys what is said accurately and does not add opinions or advice.') +
      '<h2>Translation is written</h2>' + p('A translator converts a written document from one language into another. Immigration agencies generally require a complete English translation of any foreign-language document, together with a signed statement from the translator that the translation is accurate and that they are competent in both languages.') +
      '<h2>Why it matters</h2>' + ul(['A misunderstanding in a meeting can lead to wrong information on a form.', 'A document without a proper translation can delay your case.', 'You deserve to understand everything that is said about your case.']) +
      '<h2>How to ask for what you need</h2>' + ul(['Tell us your language when you book an appointment.', 'For immigration court hearings, ask the court for an interpreter in advance. It is provided at no cost.', 'Bring documents that need translating and tell us your deadline.']) +
      p('Interpreters and translators at Vista are language support, not legal advisors. For legal advice, you will meet with a licensed attorney.') +
      p('<em>General information only.</em>'),
  },
];

const pages = [
  {
    slug: 'immigration-help-delray-beach', title: 'Immigration help in Delray Beach, FL', template: 'landing', eyebrow: 'Delray Beach',
    excerpt: 'A welcoming, professional office on E Linton Blvd for immigrants and their families.',
    meta_title: 'Immigration Help in Delray Beach, FL', meta_description: 'Vista Immigrant Support Inc. on E Linton Blvd in Delray Beach offers immigration support, document help, translation and interpreters, and connections to a licensed attorney.',
    body: p('If you live or work in Delray Beach, Boynton Beach, Boca Raton or nearby parts of Palm Beach County, you can reach Vista Immigrant Support Inc. at 100 E Linton Blvd in Delray Beach.') + '<h2>What you can get here</h2>' + ul(['Support from a friendly team who will listen first', 'Help gathering and organizing your documents', 'Translation and interpreter services', 'A connection to a licensed attorney who can represent you in immigration matters she accepts']) + '<h2>Before you visit</h2>' + p('We are open Monday through Saturday, 9:00 AM–5:00 PM, by appointment only. Call us or request a time online.') + '<h2>Who we welcome</h2>' + p('Everyone. We welcome people from every country, culture and language.') + '<p>See all <a href="/services">immigration services</a> or <a href="/appointment">schedule an appointment</a>.</p>',
  },
  {
    slug: 'asylum-help-palm-beach-county', title: 'Asylum help in Palm Beach County', template: 'service-area', eyebrow: 'Palm Beach County',
    excerpt: 'Learn how asylum applications work and how our licensed attorney can help with matters she accepts.',
    meta_title: 'Asylum Help in Palm Beach County', meta_description: 'Understand how asylum works and connect with a licensed immigration attorney through Vista Immigrant Support Inc. in Delray Beach, Palm Beach County.',
    body: p('Asylum protects people in the United States who fear serious harm in their home country. If you are in Palm Beach County and want to understand your options, you do not have to do it alone.') + '<h2>The basics</h2>' + ul(['Asylum applications are generally due within one year of arrival, with exceptions.', 'You can apply with USCIS (affirmative) or ask an immigration judge (defensive).', 'Strong evidence and a clear written statement matter.']) + '<h2>How we can help</h2>' + p('Our team helps you gather documents and organize your records. For legal advice and representation in asylum matters she accepts, our licensed attorney can meet with you.') + '<p>Read more on our <a href="/services/asylum-applications">asylum applications</a> page, or <a href="/appointment?service=Asylum%20Applications">book a time</a>.</p>',
  },
  {
    slug: 'ayuda-de-inmigracion-en-espanol', title: 'Ayuda de inmigración en español', template: 'landing', eyebrow: 'En español',
    excerpt: 'Todos son bienvenidos. Apoyo de inmigración, traducción e intérpretes en Delray Beach, Florida.',
    meta_title: 'Ayuda de inmigración en español', meta_description: 'Vista Immigrant Support Inc. en Delray Beach ofrece apoyo de inmigración, traducción de documentos, intérpretes y conexión con una abogada con licencia. Todos son bienvenidos.',
    body: '<p lang="es">En Vista Immigrant Support Inc. todos son bienvenidos. Ofrecemos un ambiente acogedor y profesional donde los inmigrantes y sus familias pueden recibir apoyo y conectarse con una abogada con licencia cuando necesiten representación legal.</p><h2 lang="es">Cómo podemos ayudarle</h2>' + ul(['Apoyo para reunir y organizar sus documentos', 'Traducción de documentos al inglés', 'Servicios de intérprete', 'Conexión con una abogada con licencia para los casos que ella acepta']) + '<h2 lang="es">Horario</h2><p lang="es">Lunes a sábado, de 9:00 AM a 5:00 PM. Solo con cita. Llámenos al 561-567-7970 o <a href="/appointment?lang=es">pida una cita</a>.</p><p lang="es"><em>Vista Immigrant Support Inc. no es un bufete de abogados. El personal que no son abogados no brinda asesoría legal.</em></p>',
  },
  {
    slug: 'privacy', title: 'Privacy policy', template: 'default', eyebrow: 'Legal',
    excerpt: 'How this website handles your information.',
    meta_description: 'How Vista Immigrant Support Inc. collects, uses and protects information submitted through this website.',
    body: p('This policy explains what information this website collects and how we use it. It is written in plain language.') + '<h2>What we collect</h2>' + p('When you send a message or request an appointment, we collect the details you enter: your name, phone number, email address (if provided), preferred language, and your message. We do not ask for your immigration status, A-Number, Social Security number, passport number, or case details, and ask that you do not send them through this website.') + '<h2>How we use it</h2>' + p('We use this information only to reply to you, schedule appointments, and run our office. We do not sell it and we do not share it for advertising.') + '<h2>Cookies and tracking</h2>' + p('This website does not use advertising or third-party tracking cookies. We count page visits with a privacy-friendly counter that does not store your IP address or place a cookie. A small cookie remembers your language choice, and a security cookie is used when you submit a form or sign in to the staff area.') + '<h2>Who can see it</h2>' + p('Only authorized Vista staff. Messages and appointment requests are protected behind a secure login.') + '<h2>How long we keep it</h2>' + p('We keep messages and appointment records only as long as needed to serve you and to meet our legal obligations. You can ask us to delete your information by calling or emailing us.') + '<h2>Contact</h2>' + p('Questions about privacy? Call 561-567-7970 or email Vistaimmigrantsupport@gmail.com.'),
  },
  {
    slug: 'terms', title: 'Terms of use', template: 'default', eyebrow: 'Legal',
    excerpt: 'The terms for using this website.',
    meta_description: 'Terms of use for the Vista Immigrant Support Inc. website, including that content is general information and not legal advice.',
    body: p('By using this website you agree to these terms.') + '<h2>General information only</h2>' + p('The content of this website is general information. It is not legal advice and it does not create an attorney-client relationship. Vista Immigrant Support Inc. is not a law firm. Legal advice and legal representation are provided by licensed attorneys for the matters they accept.') + '<h2>No guarantee of outcomes</h2>' + p('Immigration decisions are made by government agencies and courts. Nothing on this website guarantees any result.') + '<h2>Information may change</h2>' + p('Laws, forms, fees and processing times change. Please confirm current requirements before relying on information on this website.') + '<h2>Links</h2>' + p('We may link to other websites for your convenience. We are not responsible for their content.') + '<h2>Contact</h2>' + p('Questions? Call 561-567-7970.'),
  },
  {
    slug: 'accessibility', title: 'Accessibility', template: 'default', eyebrow: 'Legal',
    excerpt: 'Our commitment to an accessible website.',
    meta_description: 'How Vista Immigrant Support Inc. works to make its website usable for everyone, and how to reach us if something is hard to use.',
    body: p('We want everyone to be able to use this website, including people who use screen readers, keyboards only, or other assistive technology.') + '<h2>What we do</h2>' + ul(['Use clear headings, labels and link text', 'Support keyboard navigation and visible focus', 'Provide text alternatives for images', 'Use readable text sizes and strong color contrast', 'Respect your device’s reduced-motion setting']) + '<h2>Need help?</h2>' + p('If something on this site is hard to use, call 561-567-7970 or email Vistaimmigrantsupport@gmail.com and we will help you another way and fix the problem.'),
  },
];

const nav = {
  header: [['Home', 'Inicio', '/'], ['About Us', 'Nosotros', '/about'], ['Immigration Services', 'Servicios', '/services'], ['Meet Our Attorney', 'Nuestra abogada', '/attorney'], ['Blog', 'Blog', '/blog'], ['Contact Us', 'Contacto', '/contact']],
  footer: [['Home', 'Inicio', '/'], ['About Us', 'Nosotros', '/about'], ['Immigration Services', 'Servicios', '/services'], ['Meet Our Attorney', 'Nuestra abogada', '/attorney'], ['Schedule an Appointment', 'Pedir una cita', '/appointment'], ['Contact Us', 'Contacto', '/contact'], ['Blog', 'Blog', '/blog'], ['Immigration help in Delray Beach', 'Ayuda en Delray Beach', '/immigration-help-delray-beach'], ['Asylum help in Palm Beach County', 'Asilo en el condado de Palm Beach', '/asylum-help-palm-beach-county'], ['Ayuda en español', 'Ayuda en español', '/ayuda-de-inmigracion-en-espanol']],
};

module.exports = { services, homeFaqs, categories, posts, pages, nav };
