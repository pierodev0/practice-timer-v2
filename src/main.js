import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

import '../css/styles.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');

if (import.meta.env.DEV) {
  import('./lib/devInit.js');
}
