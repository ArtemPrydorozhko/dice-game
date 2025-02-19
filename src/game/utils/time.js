export function wait(timeInMs) {
  return new Promise((resolve) => setTimeout(resolve, timeInMs));
}
