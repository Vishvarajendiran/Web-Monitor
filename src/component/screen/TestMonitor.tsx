import { useEffect, useState } from "react"
import { checkIpApi, logEventApi, startTestApi } from "../../api"
import "./TestMonitor.css"
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Slide, Snackbar, type SlideProps } from "@mui/material"

function SlideTransition(props: SlideProps) {
    return <Slide {...props} direction="down" />
}

const TestMonitor = () => {

    const [attemptId, setAttemptId] = useState<string>("")
    const [openSnackBar, setOpenSnackBar] = useState<boolean>(false)
    const [snackMessage, setSnackMessage] = useState<string | null>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [ipCount, setIpCount] = useState<number>(0)
    const [status, setStatus] = useState<string>("NORMAL")
    const [lastWarningCount, setLastWarningCount] = useState(0)
    const [timeLeft, setTimeLeft] = useState(10)
    const [openConfirm, setOpenConfirm] = useState<boolean>(false)


    const handleStartTest = async () => {
        const enterFullScreen = () => {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            }
        };
        try {
            setLoading(true)
            const data = await startTestApi()
            enterFullScreen()
            setAttemptId(data)
        } catch (error: any) {
            setSnackMessage(error?.message)
            setOpenSnackBar(true)
        } finally {
            setLoading(false)
        }
    }


    const handleMoniterIP = async (attemptId: string) => {

        try {
            const data = await checkIpApi(attemptId)

            if (data) {
                setIpCount(data?.ipChangeCount)
                setStatus(data?.status)
                if (data?.changed && data.ipChangeCount > lastWarningCount) {

                    setSnackMessage("Network change detected")
                    setOpenSnackBar(true)

                    setLastWarningCount(data.ipChangeCount)

                    logEventApi(attemptId, "IP_CHANGE_WARNING_SHOWN", {
                        count: data.ipChangeCount
                    })
                }

                if (data.status === "SUSPICIOUS" && status !== "SUSPICIOUS") {
                    logEventApi(attemptId, "TEST_MARKED_SUSPICIOUS", {})
                }

            }


        } catch (error: any) {
            setSnackMessage(error?.message)
        }
    }


    useEffect(() => {
        if (!attemptId || status === "SUSPICIOUS" || timeLeft === 0) return

        handleMoniterIP(attemptId)

        const interval = setInterval(() => {
            handleMoniterIP(attemptId)
        }, 3000)

        return () => clearInterval(interval)

    }, [attemptId, status, timeLeft])

    useEffect(() => {
        if (attemptId) {

            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timer)
                        logEventApi(attemptId, "TIMER_EXPIRED", {})
                        setSnackMessage("Time is up. Test locked.")
                        setOpenSnackBar(true)

                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
            return () => clearInterval(timer)
        }
    }, [attemptId])


    useEffect(() => {

        const isTestActive = attemptId && timeLeft > 0 && status !== "SUSPICIOUS"

        if (!isTestActive) return

        const handleTabSwitcher = () => {
            if (document.hidden && isTestActive) {
                logEventApi(attemptId, "TAB_SWITCH_DETECTED", {})
                setSnackMessage("Tab switched detected")
                setOpenSnackBar(true)
            }
        }

        const handleCopyPasteDiducter = (e: ClipboardEvent) => {
            if (!isTestActive) return

            e.preventDefault()

            logEventApi(attemptId, "COPY_PASTE_ATTEMPT", { type: e.type })
            setSnackMessage("Copy Paste is disabled.")
            setOpenSnackBar(true)
        }

        const handleFullScreenChecker = () => {
            if (!isTestActive) return

            if (!document.fullscreenElement) {
                logEventApi(attemptId, "FULLSCREEN_EXITED", {})
                setSnackMessage("You exited fullscreen.")
                setOpenSnackBar(true)
            }
        }

        document.addEventListener("visibilitychange", handleTabSwitcher)
        document.addEventListener("copy", handleCopyPasteDiducter)
        document.addEventListener("paste", handleCopyPasteDiducter)
        document.addEventListener("fullscreenchange", handleFullScreenChecker)

        return () => {
            document.removeEventListener("visibilitychange", handleTabSwitcher)
            document.removeEventListener("copy", handleCopyPasteDiducter)
            document.removeEventListener("paste", handleCopyPasteDiducter)
            document.removeEventListener("fullscreenchange", handleFullScreenChecker)
        }

    }, [attemptId, timeLeft, status])

    const handleConfirmEndTest = async () => {
        try {
            if (attemptId && timeLeft > 0) {
                await logEventApi(attemptId, "TEST_ENDED_BY_USER", {})
            }


            if (document.fullscreenElement) {
                await document.exitFullscreen()
            }

            setAttemptId("")
            setTimeLeft(300)
            setIpCount(0)
            setStatus("NORMAL")
            setLastWarningCount(0)

        } catch (error) {
            console.error(error)
        } finally {
            setOpenConfirm(false)
        }
    }

    const endTestHandler = () => {
        setOpenConfirm(true)
    }

    return (
        <div className="container ">

            {!attemptId ? (
                <div className="d-flex justify-content-center align-items-center vh-100">
                    {loading ? (
                        <CircularProgress size={30} />
                    ) : (
                        <button
                            className="btn btn-primary px-4 py-2 attempt-test-btn"
                            onClick={handleStartTest}
                        >
                            <b>Start Test</b>
                        </button>
                    )}
                </div>
            ) : (
                <div className="row mt-5">
                    <div className="col-12">

                        <div className="row mb-3">

                            <div className="col-12 col-md-6 mb-2 mb-md-0">
                                <div>
                                    IP Change Count :&nbsp;
                                    <b className="text-primary">
                                        {ipCount}
                                    </b>
                                </div>
                                <div>
                                    Status :{" "}
                                    <b
                                        className={
                                            status === "SUSPICIOUS"
                                                ? "text-danger"
                                                : "text-success"
                                        }
                                    >
                                        {status}
                                    </b>
                                </div>
                            </div>

                            {timeLeft !== 0 && (
                                <div className="col-12 col-md-6 text-md-end">
                                    Time Remaining :{" "}
                                    <b
                                        className={
                                            timeLeft > 60
                                                ? "text-success"
                                                : "text-danger"
                                        }
                                    >
                                        {Math.floor(timeLeft / 60)}:
                                        {String(timeLeft % 60).padStart(2, "0")}
                                    </b>
                                </div>
                            )}

                        </div>

                        {status === "SUSPICIOUS" && (
                            <Alert severity="error" className="mb-3">
                                Test locked due to suspicious activity.
                            </Alert>
                        )}

                        <Snackbar
                            open={openSnackBar}
                            autoHideDuration={1800}
                            onClose={() => setOpenSnackBar(false)}
                            anchorOrigin={{ vertical: "top", horizontal: "center" }}
                            TransitionComponent={SlideTransition}
                        >
                            <Alert severity="warning" variant="filled">
                                {snackMessage}
                            </Alert>
                        </Snackbar>

                        <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)} fullWidth>
                            <DialogTitle>End Test?</DialogTitle>
                            <DialogContent>
                                Are you sure you want to end the test?
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={() => setOpenConfirm(false)} color="inherit">
                                    Cancel
                                </Button>
                                <Button onClick={handleConfirmEndTest} color="error" variant="contained">
                                    Yes, Submit
                                </Button>
                            </DialogActions>
                        </Dialog>

                        <h5 className="mb-3">What is React.Js ?</h5>

                        <textarea
                            className="form-control"
                            rows={12}
                            placeholder="Write your response..."
                            disabled={status === "SUSPICIOUS" || timeLeft === 0}
                            style={{ fontSize: "16px", cursor: timeLeft === 0 ? "not-allowed" : "default" }}
                        />
                        <div className="col-12 d-flex justify-content-end mt-4">
                            <button className="btn btn-success px-4 py-2 attempt-test-btn" onClick={endTestHandler}>Submit Test</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export { TestMonitor }