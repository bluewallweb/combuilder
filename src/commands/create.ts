import {Command, flags} from '@oclif/command';
import * as fs from 'fs';
import * as extra from 'fs-extra';
import * as gitConfig from 'git-config';

/**
 * User's name and email pull from git settings
 */
interface GitSettings {
  name: string,
  email: string,
}

interface Placeholders {
  [key: string]: string,
};

/**
 * What is returned by `git-config`
 */
interface GitSync {
  user: {
    [key: string]: string,
  }
}

export default class Create extends Command {
  /**
   * Description to display via CLI
   *
   * @var  {string}
   */
  static description = 'creates a Joomla component based on options provided';

  /**
   * List of examples to display when just the main command is ran
   *
   * @var  {string[]}
   */
  static examples = [
    `$ joomlafy create NAME VIEW`,
  ];

  static flags = {
    author: flags.string({
      char: 'a',
      description: 'author name for component metadata',
      required: false,
    }),

    createDate: flags.string({
      char: 'd',
      description: 'created date for component metadata, current date is used if this option isn\'t present',
      required: false,
    }),

    email: flags.string({
      char: 'e',
      description: 'email address for component metadata',
      required: false,
    }),

    help: flags.help({char: 'h'}),

    url: flags.string({
      char: 'u',
      description: 'url for component metadata',
      required: false
    }),

    useGit: flags.boolean({
      char: 'g',
      description: 'pull meta information from git configuration',
      required: false
    }),
  };

  /**
   * List of arguments specific to this command
   *
   * @var  {Arg[]}
   */
  static args = [
    {
      name: 'name',
      description: 'name of the component you wish to create',
      required: true,
    },
    {
      name: 'view',
      description: 'name of first view (item and list) to create',
      required: true
    }
  ];

  /**
   * Pull name and email from user's git configuration
   *
   * @return  {GitSettings}  Object containing user's name and email from git
   *                         settings
   */
  protected getGitSettings(): GitSettings {
    const settings = <GitSync>gitConfig.sync();
    return {
      name: settings.user.name,
      email: settings.user.email,
    }
  }

  async run() {
    const { args, flags } = this.parse(Create);
    // Create component with com_ prefix
    const comName = `com_${args.name}`;
    // Create component directory
    fs.mkdirSync(comName);
    // Copy over template to new directory
    extra.copySync('src/template/skeleton', comName);
    // Rename placeholder files in newly created component source
    this.renameFiles(comName, args.name, args.view);

    console.log(flags);

    // Check if user requested to use name and email from their git
    // configuration
    if (flags.useGit) {
      const gitSettings = this.getGitSettings();
    }

    this.log(fs.readdirSync(comName).join("\n"));
  }

  /**
   * Recursively get rename all files and folders containing placeholder names
   * in newly generated component folder
   *
   * @param   {string}  path  Path to start list operation in
   * @param   {string}  name  Name of component without com_ prefix
   * @param   {string}  view  Name of view to rename
   *
   * @return  {void}
   */
  protected renameFiles(path: string, name: string, view: string): void {
    // Get list of items to start renaming
    let items = fs.readdirSync(path);

    for (let item of items) {
      // Create path to current file or folder for manipulation if needed
      let newPath = `${path}/${item}`;
      // Files and folders containing the following names with be replaced
      const placeholders: Placeholders = {
        '-component_name-': name,
        '-item-': view,
        '-items-': `${view}s`,
      };
      // Loop over each in order to potentially rename
      for (let placeholder in placeholders) {
        // Check if current item matches current placeholder name
        if (item.includes(placeholder)) {
          // Replace placeholder with desired replacement
          const renamed = item.replace(placeholder, placeholders[placeholder]);
          // Use Node JS API to rename file or folder
          fs.renameSync(`${path}/${item}`, `${path}/${renamed}`);
          // Reset newPath part in case current item is a folder. Otherwise
          // recursive operation would not go deeper
          newPath = `${path}/${renamed}`;
        }
      }
      // Check if current item is folder
      if (fs.lstatSync(newPath).isDirectory()) {
        // Recursive call current method to start the next folder operation
        this.renameFiles(newPath, name, view);
      }
    }
  }
}
