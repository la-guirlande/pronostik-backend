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
    this.registerEndpoint({ method: 'GET', uri: '/:gameId', handlers: this.getHandler });
    this.registerEndpoint({ method: 'GET', uri: '/:gameId/scoreboard', handlers: this.scoreboardHandler });
    this.registerEndpoint({ method: 'POST', uri: '/', handlers: [container.auth.authenticateHandler, container.auth.isAuthenticatedHandler, this.createHandler] });
    this.registerEndpoint({ method: 'PUT', uri: '/:gameId/join', handlers: [container.auth.authenticateHandler, container.auth.isAuthenticatedHandler, this.joinHandler] });
    this.registerEndpoint({ method: 'POST', uri: '/:gameId/tracks', handlers: this.addTrackHandler });
    this.registerEndpoint({ method: 'PUT', uri: '/:gameId/tracks/:trackId/score', handlers: [container.auth.authenticateHandler, container.auth.isAuthenticatedHandler, this.addScoreHandler] });
    this.registerEndpoint({ method: 'PUT', uri: '/:gameId/tracks/:trackId/played', handlers: this.playedHandler });
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
      return res.status(200).send({ games: await this.db.games.find().populate('players').populate('tracks.scores.player') });
    } catch (err) {
      console.error(err);
      return res.status(500).send(this.container.errors.formatServerError());
    }
  }

  /**
   * Gets a game.
   * 
   * Path : `GET /games/:gameId`
   * 
   * @param req Express request
   * @param res Express response
   * @async
   */
  public async getHandler(req: Request, res: Response): Promise<Response> {
    try {
      const game = await this.db.games.findById(req.params.gameId).populate('players').populate('tracks.scores.player');
      if (game == null) {
        return res.status(404).send(this.container.errors.formatErrors({
          error: 'not_found',
          error_description: 'Game not found'
        }));
      }
      return res.status(200).send({ game });
    } catch (err) {
      console.error(err);
      return res.status(500).send(this.container.errors.formatServerError());
    }
  }

  /**
   * gets a game scoreboard.
   * 
   * Path : `GET /:gameId/scoreboard`
   * 
   * @param req Express request
   * @param res Express response
   * @async
   */
  public async scoreboardHandler(req: Request, res: Response): Promise<Response> {
    try {
      const game = await this.db.games.findById(req.params.gameId);
      if (game == null) {
        return res.status(404).send(this.container.errors.formatErrors({
          error: 'not_found',
          error_description: 'Game not found'
        }));
      }
      return res.status(200).send({ scoreboard: game.getScoreboard() });
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
    const { name, description, image } = req.body;
    try {
      const game = await this.db.games.create({
        name, description, image, players: [res.locals.authUser]
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

  /**
   * Joins a game.
   * 
   * Path : `PUT /games/:gameId/join`
   * 
   * @param req Express request
   * @param res Express response
   * @async
   */
  public async joinHandler(req: Request, res: Response): Promise<Response> {
    try {
      const game = await this.db.games.findById(req.params.gameId);
      if (game == null) {
        return res.status(404).send(this.container.errors.formatErrors({
          error: 'not_found',
          error_description: 'Game not found'
        }));
      }
      game.players.push(res.locals.authUser);
      await game.save();
      return res.status(200).send({ id: game.id });
    } catch (err) {
      this.logger.error(err);
      if (err instanceof MongooseError.ValidationError) {
        return res.status(400).send(this.container.errors.formatErrors(...this.container.errors.translateMongooseValidationError(err)));
      }
      return res.status(500).send(this.container.errors.formatServerError());
    }
  }

  /**
   * Add track to a game.
   * 
   * Path : `POST /games/:gameId/tracks`
   * 
   * @param req Express request
   * @param res Express response
   * @async
   */
  public async addTrackHandler(req: Request, res: Response): Promise<Response> {
    const { name, artists } = req.body;
    try {
      const game = await this.db.games.findById(req.params.gameId);
      if (game == null) {
        return res.status(404).send(this.container.errors.formatErrors({
          error: 'not_found',
          error_description: 'Game not found'
        }));
      }
      game.tracks.push({ name, artists });
      await game.save();
      return res.status(200).send({ id: game.id });
    } catch (err) {
      this.logger.error(err);
      if (err instanceof MongooseError.ValidationError) {
        return res.status(400).send(this.container.errors.formatErrors(...this.container.errors.translateMongooseValidationError(err)));
      }
      return res.status(500).send(this.container.errors.formatServerError());
    }
  }

  /**
   * Add score to a track.
   * 
   * Path : `POST /games/:gameId/tracks/:trackId/score`
   * 
   * @param req Express request
   * @param res Express response
   * @async
   */
  public async addScoreHandler(req: Request, res: Response): Promise<Response> {
    const { score } = req.body;
    try {
      if (score == null) {
        return res.status(400).send(this.container.errors.formatErrors({
          error: 'invalid_request',
          error_description: 'Score is required'
        }));
      }
      const game = await this.db.games.findById(req.params.gameId);
      if (game == null) {
        return res.status(404).send(this.container.errors.formatErrors({
          error: 'not_found',
          error_description: 'Game not found'
        }));
      }
      const track = game.tracks.find(track => track.id === req.params.trackId);
      track.scores.push({ player: res.locals.authUser, score });
      await game.save();
      return res.status(200).send({ id: game.id });
    } catch (err) {
      this.logger.error(err);
      if (err instanceof MongooseError.ValidationError) {
        return res.status(400).send(this.container.errors.formatErrors(...this.container.errors.translateMongooseValidationError(err)));
      }
      return res.status(500).send(this.container.errors.formatServerError());
    }
  }

  /**
   * Sets / Toggles played track.
   * 
   * Path : `POST /games/:gameId/track/:trackId/played`
   * 
   * @param req Express request
   * @param res Express response
   * @async
   */
  public async playedHandler(req: Request, res: Response): Promise<Response> {
    try {
      const game = await this.db.games.findById(req.params.gameId);
      if (game == null) {
        return res.status(404).send(this.container.errors.formatErrors({
          error: 'not_found',
          error_description: 'Game not found'
        }));
      }
      const track = game.tracks.find(track => track.id === req.params.trackId);
      track.played = req.body.played || !track.played;
      await game.save();
      return res.status(200).send({ id: game.id });
    } catch (err) {
      this.logger.error(err);
      if (err instanceof MongooseError.ValidationError) {
        return res.status(400).send(this.container.errors.formatErrors(...this.container.errors.translateMongooseValidationError(err)));
      }
      return res.status(500).send(this.container.errors.formatServerError());
    }
  }
}
