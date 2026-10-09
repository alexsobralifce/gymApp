import type { PaginaSeoDados } from './paginasSeo'

/** Versões em inglês das páginas de produto. Os caminhos têm par em scripts/paresIdioma.mjs. */
export const PAGINAS_SEO_EN: PaginaSeoDados[] = [
  {
    caminho: '/en/personal-trainer-app',
    title: 'Personal Trainer App: workout plans and client tracking | ENDORFINAPP',
    description: 'Build workout plans, send them to clients and track progress in one app. Reusable templates and client management for personal trainers.',
    h1: 'Personal trainer app: build plans and track your clients',
    lead: 'Create workouts, send them for the client to accept, and follow their sessions and progress without spreadsheets or scattered messages.',
    publico: 'Personal trainers',
    beneficios: [
      { titulo: 'Plans ready to send', texto: 'Build the workout with sets, reps and suggested load, then send it. The client accepts or declines and you follow the status.' },
      { titulo: 'Reuse workouts', texto: 'Clone one workout to several clients at once and adjust only what differs.' },
      { titulo: 'Client progress', texto: 'Follow body measurements, the workout calendar and how training volume relates to body composition.' },
      { titulo: 'Physical assessments', texto: 'Record client assessments and review the history in one place.' },
      { titulo: 'Exercises with demos', texto: 'The library has animated GIFs and step-by-step instructions, and you can add your own exercises.' },
      { titulo: 'Gym partnerships', texto: 'Request to join gyms and serve their members from the same app.' },
    ],
    passos: [
      { titulo: 'Create your account', texto: 'Sign up as a trainer and link your clients.' },
      { titulo: 'Build and send the plan', texto: 'Pick the exercises, set the weekdays and send it.' },
      { titulo: 'Follow the sessions', texto: 'See what was completed and how the client is progressing.' },
    ],
    faqs: [
      { q: 'Do I need a gym to use it?', a: 'No. Trainers can serve their own clients without a gym link. Linking to a gym is optional.' },
      { q: 'Does the client need to install an app?', a: 'No. ENDORFINAPP works in the phone browser and can be added to the home screen as a PWA.' },
      { q: 'Can I use the same workout for several clients?', a: 'Yes. Clone a workout and send it to several clients at once.' },
      { q: 'Is the app available in English?', a: 'This page and the calculators are in English. The app itself is currently in Portuguese.' },
    ],
    cta: 'Create free account',
  },
  {
    caminho: '/en/gym-management-software',
    title: 'Gym Management Software: trainers, members and workouts | ENDORFINAPP',
    description: 'Manage trainers, members and workouts in one place. Approve trainers, follow active sessions and promote offers to your members.',
    h1: 'Gym management software for trainers and members',
    lead: 'Organize who trains whom, follow the workouts in progress and keep members engaged, all in one system.',
    publico: 'Gyms',
    beneficios: [
      { titulo: 'Trainer approval', texto: 'Trainers request to join and the gym approves, keeping control over who serves your members.' },
      { titulo: 'Member overview', texto: 'See the members linked to the gym and their trainers in one list.' },
      { titulo: 'Workouts in progress', texto: 'Follow the workout plans your team creates for members.' },
      { titulo: 'Promotions', texto: 'Publish offers and news that members see in the app.' },
      { titulo: 'Capacity by plan', texto: 'Choose the plan with the number of trainers that fits your gym.' },
      { titulo: 'Works on any phone', texto: 'A responsive web app with nothing mandatory to install.' },
    ],
    passos: [
      { titulo: 'Register the gym', texto: 'Create the account and send your details for approval.' },
      { titulo: 'Link trainers and members', texto: 'Approve trainers and organize who follows whom.' },
      { titulo: 'Follow and communicate', texto: 'Watch workouts in progress and publish promotions.' },
    ],
    faqs: [
      { q: 'Do members need an account?', a: 'Yes. Each member creates their own account and links to the gym.' },
      { q: 'Can I have several trainers?', a: 'Yes. Trainers request a link and the gym approves.' },
      { q: 'Does it work on mobile?', a: 'Yes. It is a responsive web app, no mandatory installation.' },
      { q: 'Is the app available in English?', a: 'This page and the calculators are in English. The app itself is currently in Portuguese.' },
    ],
    cta: 'Register my gym',
  },
  {
    caminho: '/en/workout-app',
    title: 'Workout App with guided exercises and progress tracking | ENDORFINAPP',
    description: 'Build your own workouts or use ready-made plans, follow guided exercises with GIFs and track your progress. Train alone, with a trainer or a gym.',
    h1: 'Workout app with guided exercises and progress tracking',
    lead: 'Build your own workouts or pick a ready-made plan, log load and reps set by set, and watch your progress over time.',
    publico: 'Gym-goers',
    beneficios: [
      { titulo: 'Guided execution', texto: 'Every exercise comes with an animated GIF and steps, and you log load and reps.' },
      { titulo: 'Ready-made plans', texto: 'A plan library by experience level, such as Push, Pull and Legs, adopted in one click.' },
      { titulo: 'Train without anyone', texto: 'Create and edit workouts from scratch. A trainer or gym is optional.' },
      { titulo: 'Progress in charts', texto: 'Body measurements, a workout calendar and history per exercise.' },
      { titulo: 'Mind your aches', texto: 'Tell the app about shoulder, knee or lower-back pain so it avoids incompatible exercises.' },
      { titulo: 'Fitness social network', texto: 'Share finished workouts, add friends and join clubs.' },
    ],
    passos: [
      { titulo: 'Create your account', texto: 'Sign up as a member in a few steps.' },
      { titulo: 'Pick or build a workout', texto: 'Use a library plan or create your own.' },
      { titulo: 'Train and track', texto: 'Follow the guided workout and watch your progress.' },
    ],
    faqs: [
      { q: 'Do I need a trainer or a gym?', a: 'No. Self-managed mode lets you create and run your own workouts.' },
      { q: 'Do exercises have demos?', a: 'Yes. Each exercise has an animated GIF and execution steps.' },
      { q: 'Does it work on my phone?', a: 'Yes. It runs in the phone browser and can be added to the home screen.' },
      { q: 'Is the app available in English?', a: 'This page and the calculators are in English. The app itself is currently in Portuguese.' },
    ],
    cta: 'Create free account',
  },
]
