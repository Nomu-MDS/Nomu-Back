// Singleton pour partager l'instance socket.io entre les services REST et WS
let _io = null;

export const setIo = (io) => { _io = io; };
export const getIo = () => _io;
