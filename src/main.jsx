import { createRoot } from "react-dom/client";
import * as React from "react";

function App() {
  const [num, setNum] = React.useState(new Array(10).fill("A"));

  React.useEffect(() => {
    setTimeout(() => {
      // setNum((num) => num.map((item) => item + "B"));
    }, 10);
  }, []);

  return (
    <button
      onClick={() => {
        setNum((num) => num.map((item) => item + "C"));
      }}
    >
      {num.map((item,index) => (
        <span key={index}>{item}</span>
      ))}
    </button>
  );
}
let element = <App />;
const root = createRoot(document.getElementById("root"));
root.render(element);
// console.log(root, "root");
