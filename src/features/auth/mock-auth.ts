export const demoCredentials = {
  login: 'demo',
  password: 'demo123',
}

export type DemoUser = {
  name: string
}

type LoginResult = { ok: true; user: DemoUser } | { ok: false; message: string }

export const mockLogin = async (
  login: string,
  password: string,
): Promise<LoginResult> => {
  await new Promise((resolve) => setTimeout(resolve, 400))

  if (
    login.trim() !== demoCredentials.login ||
    password !== demoCredentials.password
  ) {
    return { ok: false, message: 'Nieprawidłowy login lub hasło.' }
  }

  return { ok: true, user: { name: 'Urzędnik demonstracyjny' } }
}
