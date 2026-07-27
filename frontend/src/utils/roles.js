function homeRouteForRole(role) {
  if (role === 'admin') return '/admin';
  if (role === 'doctor') return '/doctor';
  return '/dashboard';
}

export { homeRouteForRole };
