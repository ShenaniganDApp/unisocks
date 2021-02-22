import React from 'react'
import styled from 'styled-components'

import Button from './Button'
import { useAppContext } from '../context'
import { TRADE_TYPES } from '../utils'

const StakeButtonFrame = styled.div`
  margin: 0.5rem 0rem 0.5rem 0rem;
  display: flex;
  align-items: center;
  flex-direction: center;
  flex-direction: row;
  color: ${props => props.theme.black};

  div {
    width: 100%;
  }

  @media only screen and (max-width: 480px) {
    /* For mobile phones: */
    /* margin: 1.5rem 2rem 0.5rem 2rem; */
  }
`
const ButtonFrame = styled(Button)`
  width: 75%;
  margin: 0 auto;
`

// const Shim = styled.div`
//   width: 2rem !important;
//   height: 2rem;
// `

export default function StakeButton(props) {
  const [, setState] = useAppContext()
  return (
    <StakeButtonFrame>
      <ButtonFrame disabled={false} text={props.text} type={'cta'} />
    </StakeButtonFrame>
  )
}
