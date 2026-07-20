/**
 * BroadcastChannel helper to notify extension about auth state changes
 * The extension listens for these messages to get the JWT token
 */

const authChannel = new BroadcastChannel('jobsimply-auth');

// Notify extension about login
export const notifyLogin = (token) => {
  try {
    authChannel.postMessage({ type: 'LOGIN', token });
  } catch (e) {
    console.debug('Could not notify extension of login');
  }
};

// Notify extension about logout
export const notifyLogout = () => {
  try {
    authChannel.postMessage({ type: 'LOGOUT' });
  } catch (e) {
    console.debug('Could not notify extension of logout');
  }
};

export default authChannel;