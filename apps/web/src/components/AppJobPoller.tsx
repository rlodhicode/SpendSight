import { useEffect } from "react";
import { pollActiveJobs } from "../store/actions/jobsActions";
import { useAppDispatch } from "../store/hooks";

type AppJobPollerProps = {
  token: string;
  onTerminalStatus?: () => void;
};

export function AppJobPoller({ token, onTerminalStatus }: AppJobPollerProps) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const interval = window.setInterval(() => {
      dispatch(pollActiveJobs(token, onTerminalStatus));
    }, 2000);
    return () => window.clearInterval(interval);
  }, [dispatch, token, onTerminalStatus]);

  return null;
}
