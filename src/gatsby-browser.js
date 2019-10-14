const React = require('react');
const Wrapper = require('./Wrapper').default;

exports.wrapPageElement = ({ element, props }) => (
    <Wrapper {...props}>{element}</Wrapper>
);