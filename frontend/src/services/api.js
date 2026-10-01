import axios from 'axios'

const TOKEN_KEY = 'enterprise_ai_access_token'
const USER_KEY = 'enterprise_ai_user'

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
})


// ---------------------------------------------------------
// Request Interceptor
// ---------------------------------------------------------

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY)

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)


// ---------------------------------------------------------
// Response Interceptor
// ---------------------------------------------------------

api.interceptors.response.use(
  (response) => {
    return response
  },

  (error) => {
    const status = error?.response?.status

    if (status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)

      const currentPath =
        window.location.pathname

      if (currentPath !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)


// ---------------------------------------------------------
// Health Check
// ---------------------------------------------------------

export const checkHealth = async () => {
  const response = await api.get('/health')

  return response.data
}


export default api