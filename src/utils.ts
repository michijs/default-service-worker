import { MESSAGE_TYPES } from "./constants"

export const skipWaitingMessage = () => ({ type: MESSAGE_TYPES.SKIP_WAITING })
export const addToCache = (urls: string[]) => ({ type: MESSAGE_TYPES.ADD_TO_CACHE, urls });