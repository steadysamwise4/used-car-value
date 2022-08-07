import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { doesNotMatch } from 'assert';

describe('AuthService', () => {
  let service: AuthService;
  let fakeUsersService: Partial<UsersService>;

  beforeEach(async () => {
    // Create a fake copy of the users service
    const users: User[] = [];
    fakeUsersService = {
      find: (email: string) => {
        const filteredUsers = users.filter((user) => user.email === email);
        return Promise.resolve(filteredUsers);
      },
      create: (email: string, password: string) => {
        const user = {
          id: Math.floor(Math.random() * 999999),
          email,
          password,
        } as User;
        users.push(user);
        return Promise.resolve(user);
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: fakeUsersService,
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('can create an instance of auth service', async () => {
    expect(service).toBeDefined();
  });

  it('creates a new user with a salted and hashed password', async () => {
    const user = await service.signup('ted@mail.com', 'stranglehold');

    expect(user.password).not.toEqual('stranglehold');
    const [salt, hash] = user.password.split('.');
    expect(salt).toBeDefined();
    expect(hash).toBeDefined();
  });

  it('throws an error if user signs up with an email that is in use', async () => {
    await service.signup('george@royals.com', '390');
    await expect(
      service.signup('george@royals.com', '390'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws if signin is called with an unused email', async () => {
    try {
      await service.signin('george@royals.com', '390');
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundException);
      expect(err.message).toBe('user not found');
    }
  });

  it('throws if an invalid password is provided', async () => {
    await service.signup('george@royals.com', '390');
    await expect(
      service.signin('george@royals.com', 'password'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns a user if correct password is provided', async () => {
    await service.signup('george@royals.com', '390');

    const user = await service.signin('george@royals.com', '390');
    expect(user).toBeDefined();
  });
});
