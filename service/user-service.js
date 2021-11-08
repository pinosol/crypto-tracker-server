import UserModel from '../models/user-model.js';
import bcrypt from 'bcrypt';
import * as uuid from 'uuid';
import MailService from './mail-service.js';
import TokenService from './token-service.js';
import UserDto from '../dtos/user-dto.js';
import ApiError from '../exceptions/api-error.js';
class UserServise {
  async registration(email, password) {
    const candidate = await UserModel.findOne({ email });
    if (candidate) {
      throw ApiError.BadRequest(`User ${email} exists`);
    }
    const hashPassword = await bcrypt.hash(password, 3);
    const activationLink = uuid.v4();

    const user = await UserModel.create({
      email,
      password: hashPassword,
      activationLink,
    });
    await MailService.sendActivationMail(email, `${process.env.API_URL}/api/activate/${activationLink}`);

    const userDto = new UserDto(user); // id, email., isActivated
    const tokens = TokenService.generateTokens({ ...userDto });
    await TokenService.saveToken(userDto.id, tokens.refreshToken);

    return {
      ...tokens,
      user: userDto,
    };
  }

  async activate(activationLink) {
    const user = await UserModel.findOne({activationLink});
    if (!user) {
      throw ApiError.BadRequest('wrong activation link');
    }
    user.isActivated = true;
    await user.save();
  }
}

export default new UserServise();
