import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faEye, faEyeSlash,
  faChevronLeft, faChevronRight,
  faMagnifyingGlass,
  faCheck,
  faCartShopping,
  faCalendarDays,
  faBook,
  faUsers,
  faGear,
  faImage,
  faPencil,
  faTrash,
  faPaperPlane,
  faRobot,
  faHeadset,
  faUser,
} from '@fortawesome/free-solid-svg-icons'

import App from './App.vue'
import router from './router'
import { i18n } from '@/i18n'
import './assets/main.css'

library.add(
  faEye, faEyeSlash,
  faChevronLeft, faChevronRight,
  faMagnifyingGlass,
  faCheck,
  faCartShopping,
  faCalendarDays,
  faBook,
  faUsers,
  faGear,
  faImage,
  faPencil,
  faTrash,
  faPaperPlane,
  faRobot,
  faHeadset,
  faUser,
)

const app = createApp(App)
app.component('FontAwesomeIcon', FontAwesomeIcon)

app.use(createPinia())
app.use(router)
app.use(i18n)

app.mount('#app')
