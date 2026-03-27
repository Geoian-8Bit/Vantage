import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/types'

const api = {
  transactions: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.TRANSACTIONS_GET_ALL),
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.TRANSACTIONS_CREATE, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TRANSACTIONS_DELETE, { id }),
    update: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.TRANSACTIONS_UPDATE, { id, data })
  }
}

contextBridge.exposeInMainWorld('api', api)
