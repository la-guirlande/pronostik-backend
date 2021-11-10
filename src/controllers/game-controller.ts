import { Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';
import ServiceContainer from '../services/service-container';
import Controller from './controller';

/**
 * Games controller class.
 * 
 * Root path : `/games`
 */
export default class GameController extends Controller {

  /**
   * Creates a new games controller.
   * 
   * @param container Services container
   */
  public constructor(container: ServiceContainer) {
    super(container, '/games');
    this.registerEndpoint({ method: 'GET', uri: '/', handlers: this.listHandler });
    this.registerEndpoint({ method: 'POST', uri: '/', handlers: [container.auth.authenticateHandler, container.auth.isAuthenticatedHandler, this.createHandler] });
  }

  /**
   * Lists all games.
   * 
   * Path : `GET /games`
   * 
   * @param req Express request
   * @param res Express response
   * @async
   */
  public async listHandler(req: Request, res: Response): Promise<Response> {
    try {
      return res.status(200).send({ games: await this.db.games.find() });
    } catch (err) {
      console.error(err);
      return res.status(500).send(this.container.errors.formatServerError());
    }
  }

  /**
   * Creates a new game.
   * 
   * Path : `POST /games`
   * 
   * @param req Express request
   * @param res Express response
   * @async
   */
  public async createHandler(req: Request, res: Response): Promise<Response> {
    const { name, description } = req.body;
    try {
      const game = await this.db.games.create({
        name, description, players: [res.locals.authUser]
      });
      return res.status(201).send({ id: game.id });
    } catch (err) {
      this.logger.error(err);
      if (err instanceof MongooseError.ValidationError) {
        return res.status(400).send(this.container.errors.formatErrors(...this.container.errors.translateMongooseValidationError(err)));
      }
      return res.status(500).send(this.container.errors.formatServerError());
    }
  }
}
