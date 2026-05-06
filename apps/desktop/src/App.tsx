import { useState } from "react";
import { Login } from "./modules/Login";
import { Shell } from "./modules/Shell";

export function App() {
  const [authed, setAuthed] = useState(false);
  return authed ? <Shell /> : <Login onAuthed={() => setAuthed(true)} />;
}
