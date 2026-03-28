import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/types'

const api = {
  transactions: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.TRANSACTIONS_GET_ALL),
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.TRANSACTIONS_CREATE, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TRANSACTIONS_DELETE, { id }),
    update: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.TRANSACTIONS_UPDATE, { id, data })
  },
  categories: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_GET_ALL),
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_CREATE, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_DELETE, { id }),
    update: (id: string, name: string) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_UPDATE, { id, name })
  }
}

contextBridge.exposeInMainWorld('api', api)
