import * as React from 'react'
import { useEffect, useRef, useState } from 'react'

function Countdown(props: { seconds: number }) {
  const [timeRemaining, setTimeRemaining] = useState(props.seconds)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    if (timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prevTime: number) => prevTime - 1)
      }, 1000)

      return () => {
        clearInterval(intervalRef.current)
      }
    }
  }, [timeRemaining])

  return <>{timeRemaining}</>
}

export default Countdown
