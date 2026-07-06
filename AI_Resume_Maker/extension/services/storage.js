// Storage - Chrome storage abstraction

async function getSync(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.get([key], (result) => resolve(result[key]));
  });
}

async function setSync(data) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(data, () => resolve());
  });
}

async function getLocal(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => resolve(result[key]));
  });
}

async function setLocal(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, () => resolve());
  });
}

export async function getCurrentJob() {
  return await getLocal('currentJob');
}

export async function setCurrentJob(job) {
  await setLocal({ currentJob: job });
}

export async function getToken() {
  return await getSync('token');
}

export async function setToken(token) {
  await setSync({ token });
}

export async function getActivity() {
  const activity = await getLocal('activity');
  return activity || [];
}

export async function addActivity(item) {
  const activities = await getActivity();
  activities.unshift(item);
  await setLocal({ activity: activities.slice(0, 50) });
}