// #ifndef VUE3
import Vue from 'vue'
import Vuex from 'vuex'
import user from './modules/user'
import recommendation from './modules/recommendation'

Vue.use(Vuex)

export default new Vuex.Store({
  modules: {
    user,
    recommendation
  },
  strict: process.env.NODE_ENV !== 'production'
})
// #endif

// #ifdef VUE3
import { createStore } from 'vuex'
import user from './modules/user'
import recommendation from './modules/recommendation'

export default createStore({
  modules: {
    user,
    recommendation
  },
  strict: process.env.NODE_ENV !== 'production'
})
// #endif