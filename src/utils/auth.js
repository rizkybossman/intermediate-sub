export const checkAuth = (authModel, router) => {
  if (!authModel.isAuthenticated()) {
    router.navigateTo("/login");
    return false;
  }
  return true;
};

export const checkGuest = (authModel, router) => {
  if (authModel.isAuthenticated()) {
    router.navigateTo("/stories");
    return false;
  }
  return true;
};

