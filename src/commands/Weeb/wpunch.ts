import { LanguageKeys } from '#lib/i18n/languageKeys';
import { WeebCommand } from '#lib/structures';
import { ApplyOptions } from '@sapphire/decorators';

@ApplyOptions<WeebCommand.Options>({
	description: LanguageKeys.Commands.Weeb.PunchDescription,
	extendedHelp: LanguageKeys.Commands.Weeb.PunchExtended,
	queryType: 'punch',
	responseName: LanguageKeys.Commands.Weeb.Punch,
	usage: '<user:username>'
})
export default class extends WeebCommand {}
