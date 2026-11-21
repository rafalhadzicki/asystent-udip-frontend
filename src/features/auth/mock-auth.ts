export const demoCredentials = {
  login: 'demo',
  password: 'demo123',
}

export type DemoUser = {
  nameKey: 'auth.demo.userName'
}

type LoginResult =
  { ok: true; user: DemoUser } | { ok: false; code: 'invalidCredentials' }

export const mockLogin = async (
  login: string,
  password: string,
): Promise<LoginResult> => {
  await new Promise((resolve) => setTimeout(resolve, 400))

  if (
    login.trim() !== demoCredentials.login ||
    password !== demoCredentials.password
  ) {
    return { ok: false, code: 'invalidCredentials' }
  }

  return { ok: true, user: { nameKey: 'auth.demo.userName' } }
}
