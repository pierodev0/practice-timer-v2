import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    redirect: '/practice',
  },
  {
    path: '/practice',
    name: 'practice',
    component: () => import('../views/DashboardView.vue'),
  },
  {
    path: '/exercise/new',
    name: 'exercise-new',
    component: () => import('../views/ExerciseFormView.vue'),
  },
  {
    path: '/practice/:exerciseId',
    name: 'details',
    component: () => import('../views/DetailsView.vue'),
  },
  {
    path: '/play/:exerciseId',
    name: 'play',
    component: () => import('../views/ExercisePlayView.vue'),
  },
  {
    path: '/routines',
    name: 'routines',
    component: () => import('../views/RoutinesView.vue'),
  },
  {
    path: '/history',
    name: 'history',
    component: () => import('../views/HistoryView.vue'),
  },
  {
    path: '/stats',
    name: 'stats',
    component: () => import('../views/StatsView.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/SettingsView.vue'),
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
