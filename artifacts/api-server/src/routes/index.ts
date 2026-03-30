import { Router, type IRouter } from "express";
import healthRouter from "./health";
import questionsRouter from "./questions/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use(questionsRouter);

export default router;
