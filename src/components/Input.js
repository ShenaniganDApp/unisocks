import React, { useState } from 'react'
import styled, { css } from 'styled-components'
import { Link } from 'react-router-dom'
import { ethers } from 'ethers'
import Button from '../components/Button'

const StakingForm = styled.form`
  display: flex;
  flex: 1;
  width: 100%;
  min-height: 3rem;
`

const Title = styled.p`
  font-weight: 500;
  font-size: 24px;
  line-height: 126.7%;
  width: 100%;
  margin: 0 0 8px 0;
`
const InputWrapper = styled.div`
  /* max-width: 300px; */
  margin-bottom: 24px;

  background: #000000;
  background: linear-gradient(162.92deg, #2b2b2b 12.36%, #000000 94.75%);
  box-shadow: 0px 4px 20px rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  color: black;
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: space-between;
  cursor: default;
  padding: 24px;
  z-index: 1;
`

const StakingInfo = styled.p`
  font-weight: 600;
  font-size: 18px;
  margin: 0px;
  margin-bottom: 1rem;
  font-feature-settings: 'tnum' on, 'onum' on;
`

const Input = ({
  tokenSymbol,
  isLiquidity,
  title,
  background,
  balance,
  stakedToken,
  stake,
  withdraw,
  tokenAllowance,
  unlock
}) => {
  const [stakeAmount, setStakeAmount] = useState(0)
  const formattedBalance = balance ? ethers.utils.formatEther(balance) : 0
  const shouldRenderUnlock = tokenAllowance && tokenAllowance.eq(0)

  return (
    <InputWrapper
      style={{
        alignContent: 'space-between',
        borderRadius: '15px',
        background,
        backdropFilter: 'blur(5px)'
      }}
    >
      <Title>{title}</Title>

      <StakingForm>
        <input
          style={{
            'text-indent': '10px',
            flex: '70 1 auto',
            border: '2px solid whitesmoke',
            borderRadius: '24px',
            height: '2.5rem'
          }}
          placeholder="Input Stake Amount:"
          type="number"
          min="0"
          value={stakeAmount}
          name="name"
          onChange={e => setStakeAmount(e.target.value)}
        />
        <span
          style={{
            display: 'flex',
            flex: '30 1 auto',
            textAlign: 'center',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          onClick={() => {
            setStakeAmount(formattedBalance)
          }}
        >
          <p>Max</p>
        </span>
      </StakingForm>
      <div style={{ flexDirection: 'row', justifyContent: 'flex-start' }}>
        <StakingInfo>
          Available:
          {parseFloat(formattedBalance)
            .toFixed(4)
            .toString()}
        </StakingInfo>
      </div>

      <div
        style={{
          width: '100%',
          height: '20%',
          justifyContent: 'stretch',
          flexDirection: 'row'
        }}
      >
        {!tokenAllowance ? (
          <p>Loading...</p>
        ) : shouldRenderUnlock ? (
          <Button
            text={`Unlock ${tokenSymbol}`}
            type={'cta'}
            onClick={() => {
              unlock(false, tokenSymbol)
            }}
          />
        ) : (
          <>
            <Button
              style={{
                flex: 1
              }}
              text="Stake"
              disabled={stakeAmount > balance}
              onClick={() => (balance > stakeAmount ? stake(stakeAmount, tokenSymbol, isLiquidity) : null)}
            ></Button>
            <Button
              style={{
                flex: 1
              }}
              disabled={stakedToken < stakeAmount}
              text="Withdraw"
              onClick={() => (stakedToken > stakeAmount ? withdraw(stakeAmount, tokenSymbol, isLiquidity) : null)}
            ></Button>
          </>
        )}
      </div>
    </InputWrapper>
  )
}

export default Input
