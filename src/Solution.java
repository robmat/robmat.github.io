import java.math.BigInteger;
import java.util.Random;

public class Solution {

  static char[] HEX_CHARS = new char[] {'0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'};

  public int solution(String S) {
    int count = 0;

    for (int i = 0; i < S.length(); i++) {
      final String singleLetter = new String(new char[]{S.charAt(i)});
      String binary = new BigInteger(singleLetter, 16).toString(2);
      for (int j = 0; j < binary.length(); j++) {
        if (binary.charAt(j) == '1') count++;
      }
    }

    return count;
  }
  public static void main(String[] args) {
    System.out.println(new Solution().solution("2F"));
    System.out.println(new Solution().solution("2FAD43F"));

    StringBuilder sb = new StringBuilder();
    Random random = new Random();
    for (int i = 0; i < 999999; i++) {
      sb.append(HEX_CHARS[random.nextInt(HEX_CHARS.length)]);
    }

    System.out.println(new Solution().solution(sb.toString()));
  }
}