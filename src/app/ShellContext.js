import { createContext, useContext } from 'react'

export const ShellContext = createContext({ openMenu: () => {}, go: () => {}, menuOpen: false })
export const useShell = () => useContext(ShellContext)
