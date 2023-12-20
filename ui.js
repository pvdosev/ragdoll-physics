export function makeButtonInList(buttonLabel, listId, callback) {
  const li = document.createElement("li");
  const button = document.createElement("button");
  button.append(buttonLabel);
  button.addEventListener("click", callback);
  li.append(button);
  document.getElementById(listId).append(li);
}
