// nav.ts — cross-screen navigation bridge
let _go = (_r: string) => {}
let _arg: any = undefined
export function setNav(f: (r: string) => void) { _go = f }
export function goto(r: string, arg?: any) { _arg = arg; _go(r) }
// Hedef ekran açılışta kendisine iletilen argümanı bir kez okur (okunduktan sonra temizlenir)
export function consumeNavArg() { const a = _arg; _arg = undefined; return a }
