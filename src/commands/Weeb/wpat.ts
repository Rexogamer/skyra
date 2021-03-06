import { LanguageKeys } from '#lib/i18n/languageKeys';
import { WeebCommand } from '#lib/structures';
import { ApplyOptions } from '@sapphire/decorators';

@ApplyOptions<WeebCommand.Options>({
	description: LanguageKeys.Commands.Weeb.PatDescription,
	extendedHelp: LanguageKeys.Commands.Weeb.PatExtended,
	queryType: 'pat',
	responseName: LanguageKeys.Commands.Weeb.Pat,
	usage: '<user:username>'
})
export default class extends WeebCommand {}
